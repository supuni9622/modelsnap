import { connectDB } from "@/lib/db";
import RenderQueue from "@/models/render-queue";
import Generation from "@/models/generation";
import Render from "@/models/render";
import User from "@/models/user";
import ModelProfile from "@/models/model-profile";
import { fashnClient } from "@/lib/fashn";
import { uploadToS3, generateS3Key, isS3Configured } from "@/lib/s3";
import { applyWatermark, shouldApplyWatermark } from "@/lib/watermark";
import { sendRenderCompletionEmail } from "@/lib/email-notifications";
import { withTransaction } from "@/lib/transaction-utils";
import { createLogger } from "@/lib/utils/logger";
import { checkConsentStatus } from "@/lib/consent-utils";

const logger = createLogger({ component: "render-queue-processor" });
const ROYALTY_AMOUNT = 2.0;

/**
 * Process a single render request from the queue
 */
export async function processRenderRequest(
  queueItem: any,
  userId: string,
  batchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const user = await User.findOne({ id: userId });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const { garmentImageUrl, avatarId, avatarImageUrl, modelId, modelType } = queueItem;

    // Determine model image URL
    let modelImageUrl: string;
    let isHumanModel = modelType === "HUMAN_MODEL";

    if (isHumanModel) {
      // Human Model Flow
      if (!modelId) {
        return { success: false, error: "modelId required for human model" };
      }

      const modelProfile = await ModelProfile.findById(modelId);
      if (!modelProfile) {
        return { success: false, error: "Model profile not found" };
      }

      // No consent required for generation (preview only)
      // Consent is only required for purchase

      // Use first reference image
      modelImageUrl = modelProfile.referenceImages?.[0] || "";
      if (!modelImageUrl) {
        return { success: false, error: "Model has no reference images" };
      }
    } else {
      // AI Avatar Flow
      modelImageUrl =
        avatarImageUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${avatarId}`;
    }

    // Call FASHN API
    const fashnResponse = await fashnClient.virtualTryOn({
      garment_image: garmentImageUrl,
      model_image: modelImageUrl,
      mode: "balanced", // performance | balanced | quality
    });

    const fashnImageUrl = fashnResponse.image_url;

    // Download and process image
    let finalImageUrl = fashnImageUrl;

    if (isS3Configured()) {
      try {
        const imageResponse = await fetch(fashnImageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          let imageBuffer: Buffer = Buffer.from(arrayBuffer);

          // Store original non-watermarked image in S3
          // Watermarking will be applied on-the-fly when needed

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
        }
      } catch (s3Error) {
        logger.error("Failed to store image in S3", s3Error as Error);
      }
    }

    // Update generation/render record
    await withTransaction(async (session) => {
      if (isHumanModel) {
        await Generation.findByIdAndUpdate(
          queueItem.generationId,
          {
            status: "completed",
            outputS3Url: finalImageUrl,
            fashnRequestId: fashnResponse.request_id,
            updatedAt: new Date(),
          },
          { session }
        );
      } else {
        await Render.findByIdAndUpdate(
          queueItem.renderId,
          {
            status: "completed",
            renderedImageUrl: finalImageUrl,
            fashnRequestId: fashnResponse.request_id,
            updatedAt: new Date(),
          },
          { session }
        );
      }
    });

    // Send completion email
    if (user.emailAddress?.[0]) {
      const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
      const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/history`;

      let modelName: string | undefined;
      if (isHumanModel && modelId) {
        const model = await ModelProfile.findById(modelId);
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
    }

    return { success: true };
  } catch (error) {
    logger.error("Failed to process render request", error as Error, {
      queueItem,
      userId,
      batchId,
    });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Process the next batch in the queue
 */
export async function processNextBatch(): Promise<boolean> {
  try {
    await connectDB();

    // Find next pending batch (prioritized)
    const batch = await RenderQueue.findOne({
      status: "pending",
    })
      .sort({ priority: -1, createdAt: 1 })
      .lean();

    if (!batch) {
      return false; // No batches to process
    }

    // Type assertion: findOne().lean() returns a single document or null
    const batchDoc = batch as any;

    // Mark batch as processing
    await RenderQueue.findByIdAndUpdate(batchDoc._id, {
      status: "processing",
      startedAt: new Date(),
      processedBy: `worker-${Date.now()}`,
    });

    logger.info("Processing render batch", { batchId: batchDoc.batchId });

    // Process each request in the batch
    let completed = 0;
    let failed = 0;

    for (const request of batchDoc.requests) {
      if (request.status === "completed") {
        completed++;
        continue;
      }

      if (request.status === "failed" && request.retryCount >= 3) {
        failed++;
        continue;
      }

      // Update request status to processing
      await RenderQueue.updateOne(
        { _id: batchDoc._id, "requests._id": request._id },
        {
          $set: {
            "requests.$.status": "processing",
          },
        }
      );

      // Process the request
      const result = await processRenderRequest(request, batchDoc.userId.toString(), batchDoc.batchId);

      if (result.success) {
        await RenderQueue.updateOne(
          { _id: batchDoc._id, "requests._id": request._id },
          {
            $set: {
              "requests.$.status": "completed",
            },
            $inc: {
              completedCount: 1,
            },
          }
        );
        completed++;
      } else {
        const newRetryCount = (request.retryCount || 0) + 1;
        await RenderQueue.updateOne(
          { _id: batchDoc._id, "requests._id": request._id },
          {
            $set: {
              "requests.$.status": newRetryCount >= 3 ? "failed" : "pending",
              "requests.$.errorMessage": result.error,
              "requests.$.retryCount": newRetryCount,
            },
            $inc: {
              failedCount: newRetryCount >= 3 ? 1 : 0,
            },
          }
        );
        if (newRetryCount >= 3) {
          failed++;
        }
      }
    }

    // Mark batch as completed or failed
    const finalStatus = failed === batchDoc.totalRequests ? "failed" : "completed";
    await RenderQueue.findByIdAndUpdate(batchDoc._id, {
      status: finalStatus,
      completedAt: new Date(),
      completedCount: completed,
      failedCount: failed,
    });

    logger.info("Render batch processing complete", {
      batchId: batchDoc.batchId,
      status: finalStatus,
      completed,
      failed,
    });

    return true;
  } catch (error) {
    logger.error("Failed to process render batch", error as Error);
    return false;
  }
}

