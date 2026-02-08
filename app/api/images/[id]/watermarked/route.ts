import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import Generation from "@/models/generation";
import Render from "@/models/render";
import { applyWatermark } from "@/lib/watermark";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "watermarked-image-api" });

/**
 * GET /api/images/[id]/watermarked
 * Serve watermarked version of an image on-the-fly
 * This endpoint applies watermark to the original image and returns it
 * Should be cached by CloudFront/CDN for performance
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    try {
      await connectDB();

      const { id } = await params;
      const { searchParams } = new URL(req.url);
      const type = searchParams.get("type") || "ai"; // "ai" or "human"

      // Verify authentication
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

      // Get the generation/render record
      let imageUrl: string | null = null;

      if (type === "human") {
        const generationDoc = await Generation.findById(id).lean();
        if (!generationDoc) {
          return NextResponse.json(
            {
              status: "error",
              message: "Generation not found",
              code: "NOT_FOUND",
            },
            { status: 404 }
          );
        }

        const generation = generationDoc as any;

        // Verify ownership
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

        imageUrl = generation.outputS3Url || null;
      } else {
        const render = await Render.findById(id).lean();
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

        // Verify ownership
        if ((render as any).userId !== userId) {
          return NextResponse.json(
            {
              status: "error",
              message: "Forbidden",
              code: "FORBIDDEN",
            },
            { status: 403 }
          );
        }

        imageUrl = (render as any).outputS3Url || (render as any).renderedImageUrl || (render as any).outputUrl || null;
      }

      if (!imageUrl) {
        return NextResponse.json(
          {
            status: "error",
            message: "Image URL not found",
            code: "NO_IMAGE_URL",
          },
          { status: 404 }
        );
      }

      // Fetch the original image from S3
      const imageResponse = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!imageResponse.ok) {
        const fetchError = new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        logger.error("Failed to fetch image from S3", fetchError, {
          imageUrl,
          status: imageResponse.status,
          statusText: imageResponse.statusText,
        });
        return NextResponse.json(
          {
            status: "error",
            message: "Failed to fetch image",
            code: "FETCH_ERROR",
          },
          { status: 500 }
        );
      }

      // Apply watermark on-the-fly
      try {
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        const watermarkedBuffer = await applyWatermark(imageBuffer, "ModelSnapper.ai");
        
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

        logger.info("Watermarked image served", {
          id,
          type,
          imageUrl,
          originalSize: imageBuffer.length,
          watermarkedSize: watermarkedBuffer.length,
        });

        // Return watermarked image with cache headers
        return new NextResponse(watermarkedBuffer as any, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
            "CDN-Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch (watermarkError) {
        logger.error("Failed to apply watermark", watermarkError as Error, {
          id,
          type,
          imageUrl,
        });
        // Return error instead of original image to make the issue visible
        return NextResponse.json(
          {
            status: "error",
            message: "Failed to apply watermark",
            code: "WATERMARK_ERROR",
          },
          { status: 500 }
        );
      }
    } catch (error) {
      logger.error("Error serving watermarked image", error as Error);
      return NextResponse.json(
        {
          status: "error",
          message: "Internal server error",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

