import { connectDB } from "@/lib/db";
import { processNextBatch } from "@/lib/render-queue-processor";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * POST /api/render/worker
 * Background worker endpoint to process render queue
 * This should be called by a cron job or scheduled task
 * 
 * In production, use:
 * - Vercel Cron Jobs
 * - AWS EventBridge
 * - GitHub Actions
 * - Or a dedicated job queue service (BullMQ, Bull, etc.)
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.WEBHOOK)(async (req: NextRequest) => {
  try {
    await connectDB();

    // Optional: Add authentication for worker endpoint
    const authHeader = req.headers.get("authorization");
    const workerSecret = process.env.RENDER_WORKER_SECRET;

    if (workerSecret && authHeader !== `Bearer ${workerSecret}`) {
      return NextResponse.json(
        {
          status: "error",
          message: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Process next batch in queue
    const processed = await processNextBatch();

    if (processed) {
      return NextResponse.json(
        {
          status: "success",
          message: "Batch processed successfully",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          status: "success",
          message: "No batches to process",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error processing render queue:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to process render queue",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/render/worker
 * Health check endpoint
 */
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();
    return NextResponse.json(
      {
        status: "success",
        message: "Render worker is running",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Worker health check failed",
      },
      { status: 500 }
    );
  }
};

