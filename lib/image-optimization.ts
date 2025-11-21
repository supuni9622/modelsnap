import sharp from "sharp";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "image-optimization" });

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100, default: 85
  format?: "jpeg" | "png" | "webp" | "avif";
  progressive?: boolean; // For JPEG
  stripMetadata?: boolean; // Remove EXIF data
}

export interface OptimizationResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number; // Size in bytes
  originalSize: number;
  compressionRatio: number; // Percentage reduction
}

/**
 * Optimize image buffer
 * @param inputBuffer Original image buffer
 * @param options Optimization options
 * @returns Optimized image buffer and metadata
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 85,
    format = "jpeg",
    progressive = true,
    stripMetadata = true,
  } = options;

  const originalSize = inputBuffer.length;

  try {
    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Calculate resize dimensions (maintain aspect ratio)
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const aspectRatio = originalWidth / originalHeight;
      if (originalWidth > originalHeight) {
        targetWidth = maxWidth;
        targetHeight = Math.round(maxWidth / aspectRatio);
        if (targetHeight > maxHeight) {
          targetHeight = maxHeight;
          targetWidth = Math.round(maxHeight * aspectRatio);
        }
      } else {
        targetHeight = maxHeight;
        targetWidth = Math.round(maxHeight * aspectRatio);
        if (targetWidth > maxWidth) {
          targetWidth = maxWidth;
          targetHeight = Math.round(maxWidth / aspectRatio);
        }
      }
    }

    // Build sharp pipeline
    let pipeline = sharp(inputBuffer);

    // Resize if needed
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Strip metadata for privacy and smaller file size
    if (stripMetadata) {
      pipeline = pipeline.removeAlpha().withMetadata({});
    }

    // Convert format and apply compression
    let outputBuffer: Buffer;
    let outputFormat = format;

    switch (format) {
      case "jpeg":
        outputBuffer = await pipeline
          .jpeg({
            quality,
            progressive,
            mozjpeg: true, // Better compression
          })
          .toBuffer();
        break;

      case "png":
        outputBuffer = await pipeline
          .png({
            quality,
            compressionLevel: 9, // Max compression
            adaptiveFiltering: true,
          })
          .toBuffer();
        break;

      case "webp":
        outputBuffer = await pipeline
          .webp({
            quality,
            effort: 6, // 0-6, higher = better compression but slower
          })
          .toBuffer();
        break;

      case "avif":
        outputBuffer = await pipeline
          .avif({
            quality,
            effort: 4, // 0-9, higher = better compression but slower
          })
          .toBuffer();
        break;

      default:
        // Default to JPEG
        outputBuffer = await pipeline
          .jpeg({
            quality,
            progressive,
            mozjpeg: true,
          })
          .toBuffer();
        outputFormat = "jpeg";
    }

    const optimizedSize = outputBuffer.length;
    const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

    logger.info("Image optimized", {
      originalSize,
      optimizedSize,
      compressionRatio: compressionRatio.toFixed(2) + "%",
      originalDimensions: `${originalWidth}x${originalHeight}`,
      optimizedDimensions: `${targetWidth}x${targetHeight}`,
      format: outputFormat,
    });

    return {
      buffer: outputBuffer,
      format: outputFormat,
      width: targetWidth,
      height: targetHeight,
      size: optimizedSize,
      originalSize,
      compressionRatio,
    };
  } catch (error) {
    logger.error("Failed to optimize image", error as Error);
    // Return original buffer if optimization fails
    return {
      buffer: inputBuffer,
      format: "unknown",
      width: 0,
      height: 0,
      size: originalSize,
      originalSize,
      compressionRatio: 0,
    };
  }
}

/**
 * Optimize image for garment uploads
 * Smaller size, good quality for product photos
 */
export async function optimizeGarmentImage(
  inputBuffer: Buffer
): Promise<OptimizationResult> {
  return optimizeImage(inputBuffer, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 90, // Higher quality for product photos
    format: "jpeg",
    progressive: true,
    stripMetadata: true,
  });
}

/**
 * Optimize image for model reference photos
 * Medium size, good quality for face/body photos
 */
export async function optimizeModelReferenceImage(
  inputBuffer: Buffer
): Promise<OptimizationResult> {
  return optimizeImage(inputBuffer, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 88,
    format: "jpeg",
    progressive: true,
    stripMetadata: true,
  });
}

/**
 * Optimize generated images
 * Balanced size/quality for final renders
 */
export async function optimizeGeneratedImage(
  inputBuffer: Buffer
): Promise<OptimizationResult> {
  return optimizeImage(inputBuffer, {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
    format: "jpeg",
    progressive: true,
    stripMetadata: true,
  });
}

/**
 * Get optimal format based on browser support and use case
 * Returns best format for modern browsers (WebP/AVIF) with JPEG fallback
 */
export function getOptimalFormat(
  userAgent?: string,
  preferWebP: boolean = true
): "jpeg" | "webp" | "avif" {
  // In a real implementation, you'd check user agent or use content negotiation
  // For now, we'll use WebP as default for better compression
  // AVIF has better compression but less browser support
  if (preferWebP) {
    return "webp";
  }
  return "jpeg";
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    default:
      return "image/jpeg";
  }
}

