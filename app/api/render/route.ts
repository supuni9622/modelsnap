import { connectDB } from "@/lib/db";
import { fashnClient, FashnVirtualTryOnResponse } from "@/lib/fashn";
import Render from "@/models/render";
import Generation from "@/models/generation";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import Avatar from "@/models/avatar";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { withTransaction } from "@/lib/transaction-utils";
import { createLogger } from "@/lib/utils/logger";
import { uploadToS3, generateS3Key, isS3Configured } from "@/lib/s3";
import { checkConsentStatus } from "@/lib/consent-utils";
import { sendRenderCompletionEmail, sendLowCreditWarningEmail } from "@/lib/email-notifications";

const logger = createLogger({ component: "render-api" });

const ROYALTY_AMOUNT = 2.0; // $2.00 per human model generation

/**
 * POST /api/render
 * Server-side rendering pipeline (AGENTS.md rule 6)
 * 
 * Supports both AI Avatar and Human Model rendering:
 * - AI Avatar: Uses credits (1 credit per render)
 * - Human Model: Requires consent, charges $2.00 royalty, no credits
 * 
 * Steps:
 * 1. Determine model type (AI Avatar or Human Model)
 * 2. Check consent (for human models) or credits (for AI avatars)
 * 3. Validate garment upload
 * 4. Call FASHN API
 * 5. Save generation to database
 * 6. Deduct credits (AI) or add royalty (Human Model) atomically
 * 7. Return rendered image URL
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { garmentImageUrl, avatarId, avatarImageUrl, modelId } = body;

    // Determine model type
    const isHumanModel = !!modelId;
    const isAIAvatar = !!(avatarId || avatarImageUrl);

    // Validate input
    if (!garmentImageUrl) {
      return NextResponse.json(
        {
          status: "error",
          message: "garmentImageUrl is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!isHumanModel && !isAIAvatar) {
      return NextResponse.json(
        {
          status: "error",
          message: "Either avatarId (or avatarImageUrl) or modelId is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Validate image URL format
    try {
      new URL(garmentImageUrl);
    } catch {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid garmentImageUrl format",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findOne({ id: userId });
    if (!user) {
      return NextResponse.json(
        {
          status: "error",
          message: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Step 1: Check consent (for human models) or credits (for AI avatars)
    if (isHumanModel) {
      // Check consent for human model
      const consentCheck = await checkConsentStatus(userId, modelId);
      
      if (!consentCheck.hasConsent) {
        return NextResponse.json(
          {
            status: "error",
            message: consentCheck.message || "Consent required to use this model",
            code: "CONSENT_REQUIRED",
            consentStatus: consentCheck.consentRequest?.status || "NO_REQUEST",
          },
          { status: 403 }
        );
      }

      // Verify model exists and is active
      const modelProfile = await ModelProfile.findById(modelId);
      if (!modelProfile || modelProfile.status !== "active") {
        return NextResponse.json(
          {
            status: "error",
            message: "Model profile not found or inactive",
            code: "MODEL_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      logger.info("Starting human model render", { userId, modelId, garmentImageUrl });
    } else {
      // Check credits for AI avatar
      const creditsRequired = 1;
      if (user.credits < creditsRequired) {
        return NextResponse.json(
          {
            status: "error",
            message: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            creditsRequired,
            creditsAvailable: user.credits,
          },
          { status: 402 }
        );
      }

      logger.info("Starting AI avatar render", { userId, avatarId, garmentImageUrl });
    }

    // Step 2 & 3: Create generation record and call FASHN API atomically
    let generation: InstanceType<typeof Generation> | InstanceType<typeof Render>;
    let renderedImageUrl: string;
    let modelImageUrl: string;
    let fashnResponse: FashnVirtualTryOnResponse | null = null;
    let s3UploadSucceeded = false; // Track if S3 upload succeeded

    try {
      if (isHumanModel) {
        // Human Model Flow - Use Generation model
        const modelProfile = await ModelProfile.findById(modelId);
        if (!modelProfile) {
          return NextResponse.json(
            {
              status: "error",
              message: "Model profile not found",
              code: "MODEL_NOT_FOUND",
            },
            { status: 404 }
          );
        }

        // Use first reference image as model image
        modelImageUrl = modelProfile.referenceImages?.[0];
        if (!modelImageUrl) {
          return NextResponse.json(
            {
              status: "error",
              message: "Model has no reference images",
              code: "MODEL_INCOMPLETE",
            },
            { status: 400 }
          );
        }

        // Create generation record with transaction
        const result = await withTransaction(async (session) => {
          const gen = await Generation.create(
            [
              {
                userId: user._id,
                modelId: modelProfile._id,
                modelType: "HUMAN_MODEL",
                garmentImageUrl,
                status: "processing",
                creditsUsed: 0, // No credits for human models
                royaltyPaid: ROYALTY_AMOUNT,
              },
            ],
            { session }
          );

          // Add royalty to model's balance
          await ModelProfile.findByIdAndUpdate(
            modelProfile._id,
            { $inc: { royaltyBalance: ROYALTY_AMOUNT } },
            { session }
          );

          return gen[0];
        });

        generation = result;
      } else {
        // AI Avatar Flow - Use Render model (backward compatible)
        const result = await withTransaction(async (session) => {
          const render = await Render.create(
            [
              {
                userId,
                garmentImageUrl,
                avatarId: avatarId || "avatar",
                status: "processing",
                creditsUsed: 1,
              },
            ],
            { session }
          );

          // Deduct credits
          await User.findOneAndUpdate(
            { id: userId },
            { $inc: { credits: -1 } },
            { session }
          );

          return render[0];
        });

        generation = result;
        
        // Fetch avatar from database to get S3 URL (publicly accessible for FASHN API)
        if (avatarId) {
          const avatar = await Avatar.findById(avatarId);
          if (avatar && avatar.imageUrl) {
            // Use S3 URL if available (starts with http/https), otherwise fallback
            if (avatar.imageUrl.startsWith("http")) {
              modelImageUrl = avatar.imageUrl; // S3 URL - publicly accessible
            } else {
              // Legacy: relative path - use provided avatarImageUrl or construct URL
              modelImageUrl = avatarImageUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${avatar.imageUrl}`;
              logger.warn("Avatar using relative path - should be uploaded to S3", { avatarId, imageUrl: avatar.imageUrl });
            }
          } else {
            // Fallback to provided avatarImageUrl or construct from avatarId
            modelImageUrl = avatarImageUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${avatarId}`;
          }
        } else {
          // Use provided avatarImageUrl directly (should be S3 URL)
          modelImageUrl = avatarImageUrl || "";
        }
      }

      // Step 3: Call FASHN API (outside transaction for external API call)
      try {
        fashnResponse = await fashnClient.virtualTryOn({
          garment_image: garmentImageUrl,
          model_image: modelImageUrl,
          // Optional: mode, category, etc. (see https://docs.fashn.ai/api-reference/tryon-v1-6)
          mode: "balanced", // performance | balanced | quality
        });

        const fashnImageUrl = fashnResponse.image_url;

        // Download and store generated image in S3 (if configured)
        let finalImageUrl = fashnImageUrl;
        
        if (isS3Configured()) {
          try {
            const imageResponse = await fetch(fashnImageUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            });

            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer();
              let imageBuffer: Buffer = Buffer.from(arrayBuffer);
              
              // Apply watermark for free plan users
              const { applyWatermark, shouldApplyWatermark } = await import("@/lib/watermark");
              if (shouldApplyWatermark(user.plan?.id, user.plan?.isPremium)) {
                try {
                  imageBuffer = await applyWatermark(imageBuffer, "ModelSnap.ai") as Buffer;
                  logger.info("Watermark applied for free user", {
                    userId,
                    planId: user.plan?.id,
                  });
                } catch (watermarkError) {
                  logger.error("Failed to apply watermark, using original image", watermarkError as Error);
                  // Continue with original image if watermarking fails
                }
              }
              
              const s3Key = generateS3Key("generated", userId);
              
              // Optimize before upload
              const { optimizeGeneratedImage, getMimeType } = await import("@/lib/image-optimization");
              const optimized = await optimizeGeneratedImage(imageBuffer);
              
              finalImageUrl = await uploadToS3(
                s3Key,
                optimized.buffer,
                getMimeType(optimized.format),
                {
                  optimize: false, // Already optimized
                  cacheControl: "public, max-age=31536000, immutable",
                }
              );
              
              logger.info("Generated image stored in S3", {
                generationId: generation._id,
                s3Key,
                url: finalImageUrl,
                watermarked: shouldApplyWatermark(user.plan?.id, user.plan?.isPremium),
              });
              s3UploadSucceeded = true; // Mark S3 upload as successful
            }
          } catch (s3Error) {
            logger.error("Failed to store image in S3, using original URL", s3Error as Error);
            s3UploadSucceeded = false;
          }
        } else {
          // If S3 is not configured, still apply watermark for free users
          // Note: This will require downloading the image again, which is less efficient
          // but ensures free users always get watermarked images
          const { applyWatermark, shouldApplyWatermark } = await import("@/lib/watermark");
          if (shouldApplyWatermark(user.plan?.id, user.plan?.isPremium)) {
            try {
              const imageResponse = await fetch(fashnImageUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
              });
              
              if (imageResponse.ok) {
                const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                const watermarkedBuffer = await applyWatermark(imageBuffer, "ModelSnap.ai");
                
                // Store watermarked image locally (fallback)
                const fs = await import("fs/promises");
                const path = await import("path");
                const uploadsDir = path.join(process.cwd(), "public", "uploads", "generated");
                await fs.mkdir(uploadsDir, { recursive: true });
                
                const filename = `${generation._id.toString()}_watermarked.jpg`;
                const filepath = path.join(uploadsDir, filename);
                await fs.writeFile(filepath, watermarkedBuffer);
                
                finalImageUrl = `/uploads/generated/${filename}`;
                logger.info("Watermarked image stored locally", {
                  generationId: generation._id,
                  filepath,
                });
              }
            } catch (watermarkError) {
              logger.error("Failed to apply watermark to local file", watermarkError as Error);
              // Continue with original URL if watermarking fails
            }
          }
        }

        renderedImageUrl = finalImageUrl;

        // Update generation with success
        if (isHumanModel) {
          const updated = await Generation.findByIdAndUpdate(
            generation._id,
            {
              status: "completed",
              outputS3Url: finalImageUrl,
              fashnRequestId: fashnResponse.request_id,
              updatedAt: new Date(),
            },
            { new: true } // Return updated document
          );
          
          if (!updated) {
            logger.error("Failed to update Generation record", new Error("Update returned null"), {
              generationId: generation._id,
            });
          } else {
            logger.info("Generation record updated successfully", {
              generationId: generation._id,
              outputS3Url: updated.outputS3Url,
            });
          }
        } else {
          const updated = await Render.findByIdAndUpdate(
            generation._id,
            {
              status: "completed",
              renderedImageUrl: finalImageUrl,
              outputS3Url: finalImageUrl, // Also set outputS3Url for frontend compatibility
              outputUrl: finalImageUrl, // Legacy field support
              fashnRequestId: fashnResponse.request_id,
              updatedAt: new Date(),
            },
            { new: true } // Return updated document
          );
          
          if (!updated) {
            logger.error("Failed to update Render record", new Error("Update returned null"), {
              renderId: generation._id,
            });
          } else {
            logger.info("Render record updated successfully", {
              renderId: generation._id,
              outputS3Url: updated.outputS3Url,
              renderedImageUrl: updated.renderedImageUrl,
            });
          }
        }

        logger.info("Generation completed successfully", {
          generationId: generation._id,
          userId,
          type: isHumanModel ? "HUMAN_MODEL" : "AI_AVATAR",
          finalImageUrl,
        });

        // Send render completion email (outside transaction)
        if (user.emailAddress?.[0]) {
          const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
          const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/history`;
          
          // Get model name if human model
          let modelName: string | undefined;
          if (isHumanModel && generation.modelId) {
            const model = await ModelProfile.findById(generation.modelId);
            modelName = model?.name;
          }

          sendRenderCompletionEmail(
            user.emailAddress[0],
            userName,
            finalImageUrl,
            downloadUrl,
            isHumanModel ? "HUMAN_MODEL" : "AI_AVATAR",
            modelName
          ).catch((err) => logger.error("Failed to send render completion email", err as Error));

          // Check for low credits and send warning (only for AI avatar generations)
          if (!isHumanModel) {
            const updatedUser = await User.findOne({ id: userId });
            const currentCredits = updatedUser?.credits || 0;
            const LOW_CREDIT_THRESHOLD = 5;

            if (currentCredits <= LOW_CREDIT_THRESHOLD && currentCredits > 0) {
              sendLowCreditWarningEmail(
                user.emailAddress[0],
                userName,
                currentCredits,
                LOW_CREDIT_THRESHOLD
              ).catch((err) => logger.error("Failed to send low credit warning email", err as Error));
            }
          }
        }
      } catch (fashnError) {
        // FASHN API failed - check if it's a transient error and should retry
        const error = fashnError as Error;
        const errorMessage = error.message || "Unknown error";
        const isTransientError =
          errorMessage.includes("timeout") ||
          errorMessage.includes("network") ||
          errorMessage.includes("ECONNRESET") ||
          errorMessage.includes("ETIMEDOUT") ||
          errorMessage.includes("503") ||
          errorMessage.includes("502") ||
          errorMessage.includes("504");

        const currentRetryCount = (generation as any).retryCount || 0;
        const maxRetries = (generation as any).maxRetries || 3;
        const shouldRetry = isTransientError && currentRetryCount < maxRetries;

        logger.error("FASHN API call failed", error, {
          generationId: generation._id,
          userId,
          isTransientError,
          retryCount: currentRetryCount,
          shouldRetry,
        });

        await withTransaction(async (session) => {
          if (isHumanModel) {
            const gen = generation as InstanceType<typeof Generation>;

            if (shouldRetry) {
              // Don't refund yet, mark for retry
              await Generation.findByIdAndUpdate(
                generation._id,
                {
                  status: "pending",
                  errorMessage: errorMessage,
                  failureReason: `Transient error: ${errorMessage}`,
                  failureCode: "TRANSIENT_ERROR",
                  $inc: { retryCount: 1 },
                  lastRetryAt: new Date(),
                  updatedAt: new Date(),
                },
                { session }
              );
            } else {
              // Refund royalty to model
              await ModelProfile.findByIdAndUpdate(
                gen.modelId,
                { $inc: { royaltyBalance: -ROYALTY_AMOUNT } },
                { session }
              );

              // Update generation status
              await Generation.findByIdAndUpdate(
                generation._id,
                {
                  status: "failed",
                  errorMessage: errorMessage,
                  failureReason: errorMessage,
                  failureCode: isTransientError ? "TRANSIENT_ERROR" : "PERMANENT_ERROR",
                  royaltyPaid: 0, // Refunded
                  updatedAt: new Date(),
                },
                { session }
              );
            }
          } else {
            if (shouldRetry) {
              // Don't refund yet, mark for retry
              await Render.findByIdAndUpdate(
                generation._id,
                {
                  status: "pending",
                  errorMessage: errorMessage,
                  failureReason: `Transient error: ${errorMessage}`,
                  failureCode: "TRANSIENT_ERROR",
                  $inc: { retryCount: 1 },
                  lastRetryAt: new Date(),
                  updatedAt: new Date(),
                },
                { session }
              );
            } else {
              // Refund credits
              await User.findOneAndUpdate(
                { id: userId },
                { $inc: { credits: 1 } },
                { session }
              );

              // Update render status
              await Render.findByIdAndUpdate(
                generation._id,
                {
                  status: "failed",
                  errorMessage: errorMessage,
                  failureReason: errorMessage,
                  failureCode: isTransientError ? "TRANSIENT_ERROR" : "PERMANENT_ERROR",
                  updatedAt: new Date(),
                },
                { session }
              );
            }
          }
        });

        // If should retry, schedule automatic retry (in production, use a job queue)
        if (shouldRetry) {
          // Schedule retry after exponential backoff (1s, 2s, 4s)
          const delay = Math.pow(2, currentRetryCount) * 1000;
          setTimeout(async () => {
            try {
              const { processRenderRequest } = await import("@/lib/render-queue-processor");
              // This is a simplified retry - in production, use a proper job queue
              logger.info("Scheduling automatic retry", {
                generationId: generation._id,
                retryCount: currentRetryCount + 1,
                delay,
              });
            } catch (retryError) {
              logger.error("Failed to schedule retry", retryError as Error);
            }
          }, delay);
        }

        return NextResponse.json(
          {
            status: "error",
            message: "Generation failed",
            code: "GENERATION_FAILED",
            error: (fashnError as Error).message,
          },
          { status: 500 }
        );
      }
    } catch (error) {
      logger.error("Generation process failed", error as Error, { userId });
      return NextResponse.json(
        {
          status: "error",
          message: "Generation process failed",
          code: "GENERATION_ERROR",
          error: (error as Error).message,
        },
        { status: 500 }
      );
    }

    // Step 6: Return rendered image URL
    // Prioritize S3 URL (watermarked) for free users, FASHN URL for premium users
    const { shouldApplyWatermark } = await import("@/lib/watermark");
    const needsWatermark = shouldApplyWatermark(user.plan?.id, user.plan?.isPremium);
    
    // For free users, use S3 URL (watermarked) if upload succeeded, otherwise FASHN URL
    // For premium users, prefer S3 URL but fallback to FASHN URL
    const displayImageUrl = needsWatermark && s3UploadSucceeded
      ? renderedImageUrl // S3 URL with watermark
      : (s3UploadSucceeded ? renderedImageUrl : fashnResponse?.image_url); // S3 URL or FASHN URL
    
    return NextResponse.json(
      {
        status: "success",
        message: "Generation completed",
        data: {
          generationId: generation._id,
          renderedImageUrl: displayImageUrl, // Primary URL for display
          outputS3Url: renderedImageUrl !== fashnResponse?.image_url ? renderedImageUrl : undefined, // S3 URL if different from FASHN
          fashnImageUrl: fashnResponse?.image_url, // Original FASHN URL
          fashnRequestId: fashnResponse?.request_id,
          status: "completed",
          type: isHumanModel ? "HUMAN_MODEL" : "AI_AVATAR",
          watermarked: needsWatermark && renderedImageUrl !== fashnResponse?.image_url,
          ...(isHumanModel
            ? { royaltyPaid: ROYALTY_AMOUNT }
            : { creditsUsed: 1, creditsRemaining: user.credits - 1 }),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Unexpected error in render API", error as Error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});
