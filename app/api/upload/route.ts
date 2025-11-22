import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import {
  generatePresignedUploadUrl,
  generateS3Key,
  isS3Configured,
  uploadToS3,
} from "@/lib/s3";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * POST /api/upload
 * Handle file uploads for different image types (garments, model-references, etc.)
 * 
 * Query parameters:
 * - type: "garment" | "model-reference" | "generated" | "avatar" (default: "garment")
 * 
 * If S3 is configured: Returns pre-signed URL for direct client upload
 * If S3 is not configured: Falls back to local filesystem storage
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
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

    // Get upload type from query parameter or form data (default: "garment")
    const { searchParams } = new URL(req.url);
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    // Get type from query param, form data, or default to "garment"
    const uploadType = (searchParams.get("type") || formData.get("type") || "garment") as 
      "garment" | "generated" | "model-reference" | "avatar";
    
    // Validate upload type
    const validTypes = ["garment", "generated", "model-reference", "avatar"];
    if (!validTypes.includes(uploadType)) {
      return NextResponse.json(
        {
          status: "error",
          message: `Invalid upload type. Must be one of: ${validTypes.join(", ")}`,
          code: "INVALID_UPLOAD_TYPE",
        },
        { status: 400 }
      );
    }

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

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          status: "error",
          message: "File size exceeds 10MB limit",
          code: "FILE_TOO_LARGE",
        },
        { status: 400 }
      );
    }

    // Check if S3 is configured
    if (isS3Configured()) {
      // Generate S3 key based on upload type
      const fileExtension = file.name.split(".").pop() || "jpg";
      const s3Key = generateS3Key(uploadType, userId, file.name);

      // Generate pre-signed URL for direct client upload
      const uploadUrl = await generatePresignedUploadUrl(s3Key, file.type, 300); // 5 minutes

      // Return pre-signed URL and S3 key for client to upload directly
      return NextResponse.json(
        {
          status: "success",
          message: "Pre-signed URL generated",
          data: {
            uploadUrl, // Client uploads directly to this URL
            s3Key, // Store this in database
            key: s3Key, // Alias for compatibility
            url: s3Key, // Will be converted to public URL after upload
            filename: file.name,
            size: file.size,
            type: file.type,
            method: "PUT", // Client should use PUT method
          },
        },
        { status: 200 }
      );
    } else {
      // Fallback to local filesystem storage
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split(".").pop();
      const filename = `${userId}_${timestamp}_${randomString}.${fileExtension}`;
      const filepath = join(uploadsDir, filename);

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Return file URL (relative to public folder)
      const fileUrl = `/uploads/${filename}`;

      return NextResponse.json(
        {
          status: "success",
          message: "File uploaded successfully",
          data: {
            url: fileUrl,
            filename,
            size: file.size,
            type: file.type,
            method: "local", // Indicates local storage
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to upload file",
        code: "UPLOAD_ERROR",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
});
