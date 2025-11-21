import { connectDB } from "@/lib/db";
import RenderQueue from "@/models/render-queue";
import Generation from "@/models/generation";
import Render from "@/models/render";
import User from "@/models/user";
import ModelProfile from "@/models/model-profile";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { withTransaction } from "@/lib/transaction-utils";
import { createLogger } from "@/lib/utils/logger";
import { checkConsentStatus } from "@/lib/consent-utils";
import { randomUUID } from "crypto";

const logger = createLogger({ component: "batch-render-api" });
const ROYALTY_AMOUNT = 2.0;

/**
 * POST /api/render/batch
 * Create a batch render request
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
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

    const body = await req.json();
    const { requests, priority = "normal" } = body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "requests array is required and must not be empty",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (requests.length > 50) {
      return NextResponse.json(
        {
          status: "error",
          message: "Maximum 50 requests per batch",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Validate and prepare requests
    const validatedRequests: any[] = [];
    const generationIds: string[] = [];
    const renderIds: string[] = [];

    for (const req of requests) {
      const { garmentImageUrl, avatarId, avatarImageUrl, modelId } = req;

      if (!garmentImageUrl) {
        return NextResponse.json(
          {
            status: "error",
            message: "garmentImageUrl is required for all requests",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      const isHumanModel = !!modelId;
      const isAIAvatar = !!(avatarId || avatarImageUrl);

      if (!isHumanModel && !isAIAvatar) {
        return NextResponse.json(
          {
            status: "error",
            message: "Either avatarId/avatarImageUrl or modelId is required",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Validate human model consent
      if (isHumanModel) {
        const modelProfile = await ModelProfile.findById(modelId);
        if (!modelProfile) {
          return NextResponse.json(
            {
              status: "error",
              message: `Model profile not found for modelId: ${modelId}`,
              code: "MODEL_NOT_FOUND",
            },
            { status: 404 }
          );
        }

        const hasConsent = await checkConsentStatus(userId, modelId);
        if (!hasConsent) {
          return NextResponse.json(
            {
              status: "error",
              message: `Consent not granted for model: ${modelId}`,
              code: "CONSENT_REQUIRED",
            },
            { status: 403 }
          );
        }
      } else {
        // Check credits for AI avatar
        if (user.credits < 1) {
          return NextResponse.json(
            {
              status: "error",
              message: "Insufficient credits",
              code: "INSUFFICIENT_CREDITS",
            },
            { status: 400 }
          );
        }
      }

      // Create generation/render record
      let generationId: string | undefined;
      let renderId: string | undefined;

      await withTransaction(async (session) => {
        if (isHumanModel) {
          const modelProfile = await ModelProfile.findById(modelId).session(session);
          if (!modelProfile) throw new Error("Model profile not found");

          const gen = await Generation.create(
            [
              {
                userId: user._id,
                modelId: modelProfile._id,
                modelType: "HUMAN_MODEL",
                garmentImageUrl,
                status: "pending",
                creditsUsed: 0,
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

          generationId = gen[0]._id.toString();
        } else {
          const render = await Render.create(
            [
              {
                userId,
                garmentImageUrl,
                avatarId: avatarId || "avatar",
                status: "pending",
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

          renderId = render[0]._id.toString();
        }
      });

      validatedRequests.push({
        garmentImageUrl,
        avatarId,
        avatarImageUrl,
        modelId: isHumanModel ? modelId : undefined,
        modelType: isHumanModel ? "HUMAN_MODEL" : "AI_AVATAR",
        status: "pending",
        generationId: generationId ? generationId : undefined,
        renderId: renderId ? renderId : undefined,
        retryCount: 0,
      });

      if (generationId) generationIds.push(generationId);
      if (renderId) renderIds.push(renderId);
    }

    // Create batch queue entry
    const batchId = randomUUID();
    const batch = await RenderQueue.create({
      userId: user._id,
      batchId,
      status: "pending",
      priority,
      requests: validatedRequests,
      totalRequests: validatedRequests.length,
      completedCount: 0,
      failedCount: 0,
      processingCount: 0,
    });

    // Trigger background processing (in production, use a job queue)
    // For now, we'll process synchronously or use a background task
    // In production, use BullMQ, Bull, or similar
    processBatchInBackground(batchId).catch((err) =>
      logger.error("Failed to process batch in background", err as Error)
    );

    return NextResponse.json(
      {
        status: "success",
        message: "Batch render request created",
        data: {
          batchId: batch.batchId,
          totalRequests: batch.totalRequests,
          status: batch.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error creating batch render request", error as Error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create batch render request",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * Background processing function
 * In production, this should be handled by a job queue
 */
async function processBatchInBackground(batchId: string) {
  // Import here to avoid circular dependencies
  const { processNextBatch } = await import("@/lib/render-queue-processor");
  await processNextBatch();
}

