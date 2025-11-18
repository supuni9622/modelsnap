import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * POST /api/upload
 * Handle file uploads for garment images
 * Saves files to public/uploads directory
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

    const formData = await req.formData();
    const file = formData.get("file") as File;

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
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to upload file",
        code: "UPLOAD_ERROR",
      },
      { status: 500 }
    );
  }
});

