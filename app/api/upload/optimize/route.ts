import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import {
  optimizeGarmentImage,
  optimizeModelReferenceImage,
  optimizeGeneratedImage,
  getMimeType,
} from "@/lib/image-optimization";
import { uploadToS3, generateS3Key, isS3Configured } from "@/lib/s3";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "upload-optimize" });

/**
 * POST /api/upload/optimize
 * Server-side image optimization and upload
 * Used when client-side optimization is not possible or for server-side uploads
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "garment"; // garment, model-reference, generated

    if (!file) {
      return NextResponse.json(
        {
          status: "error",
          message: "No file provided",
          code: "NO_FILE",
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize based on type
    let optimizationResult;
    switch (type) {
      case "model-reference":
        optimizationResult = await optimizeModelReferenceImage(buffer);
        break;
      case "generated":
        optimizationResult = await optimizeGeneratedImage(buffer);
        break;
      case "garment":
      default:
        optimizationResult = await optimizeGarmentImage(buffer);
        break;
    }

    // Upload to S3 if configured
    if (isS3Configured()) {
      const s3Key = generateS3Key(
        type === "model-reference" ? "model-reference" : type === "generated" ? "generated" : "garment",
        userId
      );

      const contentType = getMimeType(optimizationResult.format);
      const url = await uploadToS3(s3Key, optimizationResult.buffer, contentType, {
        optimize: false, // Already optimized
        cacheControl: "public, max-age=31536000, immutable",
      });

      return NextResponse.json(
        {
          status: "success",
          message: "Image optimized and uploaded",
          data: {
            url,
            s3Key,
            originalSize: optimizationResult.originalSize,
            optimizedSize: optimizationResult.size,
            compressionRatio: optimizationResult.compressionRatio,
            dimensions: {
              width: optimizationResult.width,
              height: optimizationResult.height,
            },
            format: optimizationResult.format,
          },
        },
        { status: 200 }
      );
    } else {
      // Fallback: return optimized buffer (would need to save locally)
      return NextResponse.json(
        {
          status: "error",
          message: "S3 is not configured",
          code: "S3_NOT_CONFIGURED",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error optimizing and uploading image", error as Error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to optimize and upload image",
        code: "UPLOAD_ERROR",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

