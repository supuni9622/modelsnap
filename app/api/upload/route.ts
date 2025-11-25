import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import {
  generatePresignedUploadUrl,
  generateS3Key,
  isS3Configured,
} from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * POST /api/upload
 * Supports local dev (/tmp) and production (S3)
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    // Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { status: "error", message: "No file provided", code: "NO_FILE" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { status: "error", message: "Invalid file type", code: "INVALID_FILE_TYPE" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { status: "error", message: "File too large", code: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    // Determine upload type
    const uploadType = (searchParams.get("type") || formData.get("type") || "garment") as
      | "garment"
      | "generated"
      | "model-reference"
      | "avatar";

    // --- S3 Upload Path ---
    if (isS3Configured()) {
      const s3Key = generateS3Key(uploadType, userId, file.name);
      const uploadUrl = await generatePresignedUploadUrl(s3Key, file.type, 300); // 5 min

      return NextResponse.json({
        status: "success",
        message: "Pre-signed URL generated",
        data: {
          uploadUrl,
          s3Key,
          key: s3Key,
          url: s3Key, // will be converted to public URL after upload
          filename: file.name,
          size: file.size,
          type: file.type,
          method: "PUT",
        },
      });
    }

    // --- Local Dev /tmp fallback ---
    const uploadsDir = join("/tmp", "uploads");
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const filename = `${userId}_${timestamp}_${randomString}.${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Local URL (relative to server, client must fetch via API to access)
    const fileUrl = `/api/upload/local?file=${filename}`;

    return NextResponse.json({
      status: "success",
      message: "File uploaded locally",
      data: {
        url: fileUrl,
        filename,
        size: file.size,
        type: file.type,
        method: "local",
        tmpPath: filepath,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { status: "error", message: "Upload failed", code: "UPLOAD_ERROR", error: (error as Error).message },
      { status: 500 }
    );
  }
});
