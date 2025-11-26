import { connectDB } from "@/lib/db";
import Generation from "@/models/generation";
import Render from "@/models/render";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/render/[id]/status
 * Get render status (for polling)
 */
export async function GET(
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

      // Try Generation first (human model)
      let generation = await Generation.findById(id).lean();
      if (generation && !Array.isArray(generation)) {
        const user = await (await import("@/models/user")).default.findOne({ id: userId });
        if (!user || generation.userId.toString() !== user._id.toString()) {
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
              id: (generation._id as { toString(): string }).toString(),
              status: generation.status,
              modelType: generation.modelType,
              outputS3Url: generation.outputS3Url,
              errorMessage: generation.errorMessage,
              retryCount: generation.retryCount || 0,
              maxRetries: generation.maxRetries || 3,
              failureReason: generation.failureReason,
              failureCode: generation.failureCode,
              createdAt: generation.createdAt,
              updatedAt: generation.updatedAt,
            },
          },
          { status: 200 }
        );
      }

      // Try Render (AI avatar)
      const render = await Render.findById(id).lean();
      if (render && !Array.isArray(render)) {
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

        return NextResponse.json(
          {
            status: "success",
            data: {
              id: (render._id as { toString(): string }).toString(),
              status: render.status,
              modelType: "AI_AVATAR",
              renderedImageUrl: render.renderedImageUrl,
              errorMessage: render.errorMessage,
              retryCount: render.retryCount || 0,
              maxRetries: render.maxRetries || 3,
              failureReason: render.failureReason,
              failureCode: render.failureCode,
              createdAt: render.createdAt,
              updatedAt: render.updatedAt,
            },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          status: "error",
          message: "Render not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    } catch (error) {
      console.error("Error fetching render status:", error);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to fetch render status",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

