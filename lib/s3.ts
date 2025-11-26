import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "s3" });

/**
 * S3 Configuration
 */
const S3_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";
const S3_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

/**
 * Initialize S3 Client
 */
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
    ? {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      }
    : undefined,
});

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    S3_BUCKET_NAME &&
    S3_ACCESS_KEY_ID &&
    S3_SECRET_ACCESS_KEY &&
    S3_REGION
  );
}

/**
 * Generate S3 key (path) for different file types
 */
export function generateS3Key(
  type: "garment" | "generated" | "model-reference" | "avatar",
  userId: string,
  filename?: string
): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  
  switch (type) {
    case "garment":
      return `garments/${userId}/${timestamp}_${randomString}${filename ? `_${filename}` : ""}`;
    case "generated":
      return `generated/${userId}/${timestamp}_${randomString}.jpg`;
    case "model-reference":
      return `model-references/${userId}/${timestamp}_${randomString}${filename ? `_${filename}` : ""}`;
    case "avatar":
      return `avatars/${filename || `${timestamp}_${randomString}.jpg`}`;
    default:
      return `uploads/${userId}/${timestamp}_${randomString}${filename ? `_${filename}` : ""}`;
  }
}

/**
 * Generate pre-signed URL for direct client upload
 * @param key S3 object key
 * @param contentType MIME type of the file
 * @param expiresIn URL expiration time in seconds (default: 5 minutes)
 * @returns Pre-signed URL for PUT operation
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured. Please set AWS environment variables.");
  }

  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    logger.info("Generated pre-signed upload URL", { key, contentType });
    return url;
  } catch (error) {
    logger.error("Failed to generate pre-signed URL", error as Error, { key });
    throw error;
  }
}

/**
 * Generate pre-signed URL for downloading/viewing
 * @param key S3 object key
 * @param expiresIn URL expiration time in seconds (default: 1 hour)
 * @returns Pre-signed URL for GET operation
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured. Please set AWS environment variables.");
  }

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error("Failed to generate pre-signed download URL", error as Error, { key });
    throw error;
  }
}

/**
 * Upload file to S3 (server-side upload)
 * @param key S3 object key
 * @param buffer File buffer
 * @param contentType MIME type
 * @param options Additional upload options (cache control, etc.)
 * @returns S3 URL of uploaded file
 */
export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string,
  options?: {
    cacheControl?: string;
    metadata?: Record<string, string>;
    optimize?: boolean;
    optimizationOptions?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: "jpeg" | "png" | "webp" | "avif";
    };
  }
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured. Please set AWS environment variables.");
  }

  try {
    let finalBuffer = buffer;
    let finalContentType = contentType;

    // Optimize image if requested
    if (options?.optimize && contentType.startsWith("image/")) {
      try {
        const { optimizeImage, getMimeType } = await import("@/lib/image-optimization");
        const result = await optimizeImage(buffer, options.optimizationOptions || {});
        finalBuffer = result.buffer;
        finalContentType = getMimeType(result.format);
        logger.info("Image optimized before upload", {
          key,
          originalSize: buffer.length,
          optimizedSize: finalBuffer.length,
          compressionRatio: result.compressionRatio.toFixed(2) + "%",
        });
      } catch (optimizeError) {
        logger.error("Failed to optimize image, using original", optimizeError as Error);
        // Continue with original buffer
      }
    }

    // Set cache control headers for CDN
    const cacheControl =
      options?.cacheControl ||
      (contentType.startsWith("image/")
        ? "public, max-age=31536000, immutable" // 1 year for images
        : "public, max-age=3600"); // 1 hour for other files

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: finalBuffer,
      ContentType: finalContentType,
      CacheControl: cacheControl,
      Metadata: options?.metadata || {},
    });

    await s3Client.send(command);

    // Return public URL (CDN URL if configured, otherwise S3 URL)
    const publicUrl = getS3PublicUrl(key);

    logger.info("File uploaded to S3", {
      key,
      contentType: finalContentType,
      url: publicUrl,
      size: finalBuffer.length,
    });
    return publicUrl;
  } catch (error) {
    logger.error("Failed to upload to S3", error as Error, { key });
    throw error;
  }
}

/**
 * Delete file from S3
 * @param key S3 object key
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured. Please set AWS environment variables.");
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    logger.info("File deleted from S3", { key });
  } catch (error) {
    logger.error("Failed to delete from S3", error as Error, { key });
    throw error;
  }
}

/**
 * Get public URL for S3 object (if bucket is public)
 * Supports CDN URLs (CloudFront) if configured
 * @param key S3 object key
 * @returns Public URL (CDN URL if configured, otherwise S3 URL)
 */
export function getS3PublicUrl(key: string): string {
  if (!S3_BUCKET_NAME) {
    throw new Error("S3 bucket name is not configured");
  }

  // Use CloudFront CDN URL if configured
  if (process.env.AWS_CLOUDFRONT_DOMAIN) {
    // Remove leading slash if present
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    return `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${cleanKey}`;
  }

  // Use custom public URL if configured (e.g., other CDN)
  if (process.env.AWS_S3_PUBLIC_URL) {
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    return `${process.env.AWS_S3_PUBLIC_URL}/${cleanKey}`;
  }

  // Standard S3 public URL (requires bucket to be public or proper IAM permissions)
  return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

/**
 * Extract S3 key from S3 URL
 * @param url S3 URL
 * @returns S3 key or null if not a valid S3 URL
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    // Handle different S3 URL formats
    const patterns = [
      /https?:\/\/[^\/]+\/(.+)$/, // Standard S3 URL
      /s3:\/\/(.+)$/, // S3 protocol URL
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If it's already a key (no protocol), return as-is
    if (!url.includes("://") && !url.startsWith("/")) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

