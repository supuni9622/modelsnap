import { connectDB } from "@/lib/db";
import { fashnClient } from "@/lib/fashn";
import Render from "@/models/render";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { withTransaction } from "@/lib/transaction-utils";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "render-api" });

/**
 * POST /api/render
 * Server-side rendering pipeline (AGENTS.md rule 6)
 * 
 * Steps:
 * 1. Check user credits
 * 2. Validate garment upload
 * 3. Call FASHN API
 * 4. Save render to database
 * 5. Deduct credits atomically
 * 6. Return rendered image URL
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
    const { garmentImageUrl, avatarId, avatarImageUrl } = body;

    // Validate input
    if (!garmentImageUrl || (!avatarId && !avatarImageUrl)) {
      return NextResponse.json(
        {
          status: "error",
          message: "garmentImageUrl and avatarId (or avatarImageUrl) are required",
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

    // Step 1: Check user credits
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

    const creditsRequired = 1; // 1 credit per render
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

    logger.info("Starting render process", { userId, garmentImageUrl, avatarId });

    // Step 2 & 3: Create render record and call FASHN API atomically
    let render: InstanceType<typeof Render>;
    let renderedImageUrl: string;

    try {
      // Use transaction to ensure atomicity
      const result = await withTransaction(async (session) => {
        // Create render record with pending status
        render = await Render.create(
          [
            {
              userId,
              garmentImageUrl,
              avatarId,
              status: "processing",
              creditsUsed: creditsRequired,
            },
          ],
          { session }
        );

        // Deduct credits
        await User.findOneAndUpdate(
          { id: userId },
          { $inc: { credits: -creditsRequired } },
          { session }
        );

        return render[0];
      });

      render = result;

      // Step 3: Call FASHN API (outside transaction for external API call)
      try {
        // Use avatarImageUrl if provided, otherwise construct from avatarId
        const modelImageUrl = avatarImageUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${avatarId}`;
        
        const fashnResponse = await fashnClient.virtualTryOn({
          garment_image: garmentImageUrl,
          model_image: modelImageUrl,
          prompt: "photo-realistic fit, natural shadows",
          resolution: 768, // Try-on resolution (faster & cheaper per guide)
        });

        renderedImageUrl = fashnResponse.image_url;

        // Update render with success
        await Render.findByIdAndUpdate(render._id, {
          status: "completed",
          renderedImageUrl,
          fashnRequestId: fashnResponse.request_id,
          updatedAt: new Date(),
        });

        logger.info("Render completed successfully", {
          renderId: render._id,
          userId,
        });
      } catch (fashnError) {
        // FASHN API failed - refund credits and update render status
        logger.error("FASHN API call failed", fashnError as Error, {
          renderId: render._id,
          userId,
        });

        await withTransaction(async (session) => {
          // Refund credits
          await User.findOneAndUpdate(
            { id: userId },
            { $inc: { credits: creditsRequired } },
            { session }
          );

          // Update render status
          await Render.findByIdAndUpdate(
            render._id,
            {
              status: "failed",
              errorMessage: (fashnError as Error).message,
              updatedAt: new Date(),
            },
            { session }
          );
        });

        return NextResponse.json(
          {
            status: "error",
            message: "Render failed",
            code: "RENDER_FAILED",
            error: (fashnError as Error).message,
          },
          { status: 500 }
        );
      }
    } catch (error) {
      logger.error("Render process failed", error as Error, { userId });
      return NextResponse.json(
        {
          status: "error",
          message: "Render process failed",
          code: "RENDER_ERROR",
          error: (error as Error).message,
        },
        { status: 500 }
      );
    }

    // Step 6: Return rendered image URL
    return NextResponse.json(
      {
        status: "success",
        message: "Render completed",
        data: {
          renderId: render._id,
          renderedImageUrl,
          status: "completed",
          creditsUsed: creditsRequired,
          creditsRemaining: user.credits - creditsRequired,
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

