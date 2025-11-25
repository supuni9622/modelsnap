import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { generatePresignedUploadUrl, generateS3Key, isS3Configured } from "@/lib/s3";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * POST /api/upload
 * Handles file uploads for local (/tmp) and S3 (production)
 */
export async function POST(req: NextRequest) {
  // Wrap with rate limiter inside the exported function
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    try {
      // --- Auth ---
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

      // --- Validate file ---
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { status: "error", message: "Invalid file type", code: "INVALID_FILE_TYPE" },
          { status: 400 }
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { status: "error", message: "File too large", code: "FILE_TOO_LARGE" },
          { status: 400 }
        );
      }

      const uploadType = (searchParams.get("type") || formData.get("type") || "garment") as
        | "garment"
        | "generated"
        | "model-reference"
        | "avatar";

      // --- S3 Upload (Production) ---
      if (isS3Configured()) {
        const s3Key = generateS3Key(uploadType, userId, file.name);
        const uploadUrl = await generatePresignedUploadUrl(s3Key, file.type, 300); // 5 minutes

        return NextResponse.json({
          status: "success",
          message: "Pre-signed URL generated",
          data: {
            uploadUrl,
            s3Key,
            key: s3Key,
            url: s3Key, // Client should convert to public URL after upload
            filename: file.name,
            size: file.size,
            type: file.type,
            method: "PUT",
          },
        });
      }

      // --- Local Dev Upload (/tmp fallback) ---
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

      // Local URL (client must fetch via API if needed)
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
        {
          status: "error",
          message: "Upload failed",
          code: "UPLOAD_ERROR",
          error: (error as Error).message,
        },
        { status: 500 }
      );
    }
  })(req);
}
