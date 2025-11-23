import { connectDB } from "@/lib/db";
import Generation from "@/models/generation";
import Render from "@/models/render";
import User from "@/models/user";
import ModelProfile from "@/models/model-profile";
import BusinessProfile from "@/models/business-profile";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { fashnClient } from "@/lib/fashn";
import { uploadToS3, generateS3Key, isS3Configured } from "@/lib/s3";
import { applyWatermark, shouldApplyWatermark } from "@/lib/watermark";
import { sendRenderCompletionEmail } from "@/lib/email-notifications";
import { withTransaction } from "@/lib/transaction-utils";
import { createLogger } from "@/lib/utils/logger";
import { checkConsentStatus } from "@/lib/consent-utils";

const logger = createLogger({ component: "render-retry-api" });
const ROYALTY_AMOUNT = 2.0;

/**
 * POST /api/render/[id]/retry
 * Retry a failed render
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    const { id } = await params;
    try {
      await connectDB();

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

      // Try Generation first (human model)
      let generation = await Generation.findById(id);
      let isGeneration = !!generation;
      let render = null;

      if (!generation) {
        render = await Render.findById(id);
        if (!render) {
          return NextResponse.json(
            {
              status: "error",
              message: "Render not found",
              code: "NOT_FOUND",
            },
            { status: 404 }
          );
        }

        // Check ownership
        if (render.userId !== userId) {
          return NextResponse.json(
            {
              status: "error",
              message: "Forbidden",
              code: "FORBIDDEN",
            },
            { status: 403 }
          );
        }

        // Check if can retry
        if (render.status !== "failed") {
          return NextResponse.json(
            {
              status: "error",
              message: "Render is not in failed state",
              code: "INVALID_STATE",
            },
            { status: 400 }
          );
        }

        if ((render.retryCount || 0) >= (render.maxRetries || 3)) {
          return NextResponse.json(
            {
              status: "error",
              message: "Maximum retry attempts reached",
              code: "MAX_RETRIES_EXCEEDED",
            },
            { status: 400 }
          );
        }
      } else {
        // Check ownership
        if (generation.userId.toString() !== user._id.toString()) {
          return NextResponse.json(
            {
              status: "error",
              message: "Forbidden",
              code: "FORBIDDEN",
            },
            { status: 403 }
          );
        }

        // Check if can retry
        if (generation.status !== "failed") {
          return NextResponse.json(
            {
              status: "error",
              message: "Generation is not in failed state",
              code: "INVALID_STATE",
            },
            { status: 400 }
          );
        }

        if ((generation.retryCount || 0) >= (generation.maxRetries || 3)) {
          return NextResponse.json(
            {
              status: "error",
              message: "Maximum retry attempts reached",
              code: "MAX_RETRIES_EXCEEDED",
            },
            { status: 400 }
          );
        }
      }

      // Determine model image URL
      let modelImageUrl: string;
      let isHumanModel = isGeneration && generation?.modelType === "HUMAN_MODEL";

      if (isHumanModel && generation) {
        const modelProfile = await ModelProfile.findById(generation.modelId);
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

        // No consent required for generation (preview only)
        // Consent is only required for purchase

        modelImageUrl = modelProfile.referenceImages?.[0] || "";
      } else if (render) {
        modelImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${render.avatarId}`;
      } else {
        return NextResponse.json(
          {
            status: "error",
            message: "Invalid render data",
            code: "INVALID_DATA",
          },
          { status: 400 }
        );
      }

      // Update status to processing and increment retry count
      await withTransaction(async (session) => {
        if (isGeneration && generation) {
          await Generation.findByIdAndUpdate(
            generation._id,
            {
              status: "processing",
              $inc: { retryCount: 1 },
              lastRetryAt: new Date(),
            },
            { session }
          );
        } else if (render) {
          await Render.findByIdAndUpdate(
            render._id,
            {
              status: "processing",
              $inc: { retryCount: 1 },
              lastRetryAt: new Date(),
            },
            { session }
          );
        }
      });

      // Call FASHN API
      const garmentImageUrl = isGeneration
        ? generation?.garmentImageUrl
        : render?.garmentImageUrl;

      if (!garmentImageUrl) {
        return NextResponse.json(
          {
            status: "error",
            message: "Garment image URL not found",
            code: "INVALID_DATA",
          },
          { status: 400 }
        );
      }

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

      // Update generation/render with success
      await withTransaction(async (session) => {
        if (isGeneration && generation) {
          await Generation.findByIdAndUpdate(
            generation._id,
            {
              status: "completed",
              outputS3Url: finalImageUrl,
              fashnRequestId: fashnResponse.request_id,
              updatedAt: new Date(),
            },
            { session }
          );
        } else if (render) {
          await Render.findByIdAndUpdate(
            render._id,
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
        if (isHumanModel && generation?.modelId) {
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
      }

      return NextResponse.json(
        {
          status: "success",
          message: "Render retried successfully",
          data: {
            id: isGeneration ? generation?._id.toString() : render?._id.toString(),
            status: "completed",
            imageUrl: finalImageUrl,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      logger.error("Error retrying render", error as Error);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to retry render",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

