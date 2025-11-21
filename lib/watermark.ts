import sharp from "sharp";

/**
 * Apply watermark to an image
 * @param imageBuffer - Buffer containing the image data
 * @param watermarkText - Text to use as watermark (default: "ModelSnap.ai")
 * @returns Buffer containing the watermarked image
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  watermarkText: string = "ModelSnap.ai"
): Promise<Buffer> {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 768;
    const height = metadata.height || 768;

    // Calculate watermark size based on image dimensions
    const fontSize = Math.max(24, Math.floor(width / 20));
    const watermarkWidth = Math.floor(width * 0.4); // 40% of image width
    const watermarkHeight = Math.floor(height * 0.1); // 10% of image height

    // Create watermark SVG
    const watermarkSvg = `
      <svg width="${watermarkWidth}" height="${watermarkHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,0.8);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(255,255,255,0.6);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.3)" rx="8"/>
        <text
          x="50%"
          y="50%"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
          dominant-baseline="middle"
          opacity="0.9"
        >
          ${watermarkText}
        </text>
      </svg>
    `;

    const watermarkBuffer = Buffer.from(watermarkSvg);

    // Position watermark in bottom-right corner with padding
    const watermarkX = Math.floor(width - watermarkWidth - width * 0.05); // 5% padding from right
    const watermarkY = Math.floor(height - watermarkHeight - height * 0.05); // 5% padding from bottom

    // Apply watermark to image
    const watermarkedImage = await sharp(imageBuffer)
      .composite([
        {
          input: watermarkBuffer,
          top: watermarkY,
          left: watermarkX,
        },
      ])
      .jpeg({ quality: 90 }) // Convert to JPEG with high quality
      .toBuffer();

    return watermarkedImage;
  } catch (error) {
    console.error("Error applying watermark:", error);
    // Return original image if watermarking fails
    return imageBuffer;
  }
}

/**
 * Check if user should have watermarked images
 * @param planId - User's plan ID
 * @param isPremium - Whether user has premium plan
 * @returns true if watermark should be applied
 */
export function shouldApplyWatermark(planId?: string, isPremium?: boolean): boolean {
  // Apply watermark for free plan users
  return planId === "free" || planId === undefined || isPremium === false;
}

