import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { getS3PublicUrl, isS3Configured } from "@/lib/s3";

/**
 * POST /api/upload/confirm
 * Confirm S3 upload completion and return public URL
 * Called after client successfully uploads to pre-signed URL
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

    const body = await req.json();
    const { s3Key } = body;

    if (!s3Key) {
      return NextResponse.json(
        {
          status: "error",
          message: "s3Key is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!isS3Configured()) {
      return NextResponse.json(
        {
          status: "error",
          message: "S3 is not configured",
          code: "S3_NOT_CONFIGURED",
        },
        { status: 500 }
      );
    }

    // Generate public URL for the uploaded file
    const publicUrl = getS3PublicUrl(s3Key);

    return NextResponse.json(
      {
        status: "success",
        message: "Upload confirmed",
        data: {
          url: publicUrl,
          s3Key,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error confirming upload:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to confirm upload",
        code: "CONFIRM_ERROR",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

