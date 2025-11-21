import { connectDB } from "@/lib/db";
import RenderQueue from "@/models/render-queue";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/render/batch/[batchId]
 * Get batch render status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    const { batchId } = await params;
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

      const batch = await RenderQueue.findOne({ batchId }).lean();

      if (!batch) {
        return NextResponse.json(
          {
            status: "error",
            message: "Batch not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Check ownership
      const user = await (await import("@/models/user")).default.findOne({ id: userId });
      if (!user || batch.userId.toString() !== user._id.toString()) {
        return NextResponse.json(
          {
            status: "error",
            message: "Forbidden",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          status: "success",
          data: {
            batchId: batch.batchId,
            status: batch.status,
            totalRequests: batch.totalRequests,
            completedCount: batch.completedCount,
            failedCount: batch.failedCount,
            processingCount: batch.processingCount,
            requests: batch.requests,
            startedAt: batch.startedAt,
            completedAt: batch.completedAt,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error fetching batch status:", error);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to fetch batch status",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

