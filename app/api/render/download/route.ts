import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { connectDB } from "@/lib/db";
import Render from "@/models/render";
import Generation from "@/models/generation";
import User from "@/models/user";

/**
 * GET /api/render/download
 * Download a generated image by ID
 * Proxies the image to avoid CORS issues
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
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

    const { searchParams } = new URL(req.url);
    const renderId = searchParams.get("id");
    const type = searchParams.get("type") || "ai"; // "ai" or "human"

    if (!renderId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Render ID is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Fetch the render/generation record
    let imageUrl: string | null = null;

    if (type === "human") {
      const generationDoc = await Generation.findById(renderId).lean();
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

      const generation = generationDoc as unknown as {
        _id: any;
        userId: any;
        outputS3Url?: string;
      };

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

      // Generation model has outputS3Url field
      imageUrl = generation.outputS3Url || null;
    } else {
      const renderDoc = await Render.findById(renderId).lean();
      if (!renderDoc) {
        return NextResponse.json(
          {
            status: "error",
            message: "Render not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const render = renderDoc as unknown as {
        _id: any;
        userId: string;
        outputS3Url?: string;
        renderedImageUrl?: string;
        outputUrl?: string;
      };

      // Verify ownership
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

      imageUrl = render.outputS3Url || render.renderedImageUrl || render.outputUrl || null;
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

    // Fetch the image
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!imageResponse.ok) {
        return NextResponse.json(
          {
            status: "error",
            message: "Failed to fetch image",
            code: "FETCH_ERROR",
          },
          { status: 500 }
        );
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

      // Return the image with appropriate headers for download
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="generated-${renderId}.${contentType.includes("png") ? "png" : "jpg"}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (fetchError) {
      console.error("Error fetching image for download:", fetchError);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to fetch image",
          code: "FETCH_ERROR",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in download endpoint:", error);
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

