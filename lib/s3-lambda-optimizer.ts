/**
 * S3 Lambda Optimizer Configuration
 * 
 * This file documents the Lambda function setup for optimizing images
 * uploaded via pre-signed URLs. Since we can't optimize before client upload,
 * we use a Lambda trigger to optimize after upload.
 * 
 * Note: This is a reference implementation. The actual Lambda function
 * should be deployed separately in AWS.
 */

/**
 * Lambda Function: optimize-s3-images
 * 
 * Trigger: S3 PutObject event
 * Runtime: Node.js 20.x
 * Memory: 1024 MB
 * Timeout: 30 seconds
 * 
 * Environment Variables:
 * - S3_BUCKET: Your S3 bucket name
 * - OPTIMIZE_PATHS: Comma-separated paths to optimize (e.g., "garments/,model-references/")
 * - MAX_WIDTH: Maximum image width (default: 2048)
 * - MAX_HEIGHT: Maximum image height (default: 2048)
 * - QUALITY: JPEG quality 1-100 (default: 85)
 */

/**
 * Example Lambda Function Code (Node.js)
 * 
 * This would be deployed as a separate Lambda function:
 * 
 * ```javascript
 * const sharp = require('sharp');
 * const AWS = require('aws-sdk');
 * const s3 = new AWS.S3();
 * 
 * exports.handler = async (event) => {
 *   const bucket = event.Records[0].s3.bucket.name;
 *   const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
 *   
 *   // Check if image should be optimized
 *   const optimizePaths = process.env.OPTIMIZE_PATHS?.split(',') || [];
 *   const shouldOptimize = optimizePaths.some(path => key.startsWith(path));
 *   
 *   if (!shouldOptimize) {
 *     return { statusCode: 200, body: 'Skipped - not in optimize paths' };
 *   }
 *   
 *   try {
 *     // Get object from S3
 *     const object = await s3.getObject({ Bucket: bucket, Key: key }).promise();
 *     
 *     // Optimize image
 *     const optimized = await sharp(object.Body)
 *       .resize(parseInt(process.env.MAX_WIDTH || '2048'), parseInt(process.env.MAX_HEIGHT || '2048'), {
 *         fit: 'inside',
 *         withoutEnlargement: true
 *       })
 *       .jpeg({ quality: parseInt(process.env.QUALITY || '85'), progressive: true, mozjpeg: true })
 *       .toBuffer();
 *     
 *     // Upload optimized image back to S3 (overwrite original)
 *     await s3.putObject({
 *       Bucket: bucket,
 *       Key: key,
 *       Body: optimized,
 *       ContentType: 'image/jpeg',
 *       CacheControl: 'public, max-age=31536000, immutable'
 *     }).promise();
 *     
 *     return { statusCode: 200, body: 'Image optimized successfully' };
 *   } catch (error) {
 *     console.error('Error optimizing image:', error);
 *     return { statusCode: 500, body: 'Error optimizing image' };
 *   }
 * };
 * ```
 */

/**
 * S3 Event Notification Configuration
 * 
 * Configure S3 bucket to trigger Lambda on PutObject:
 * 
 * 1. Go to S3 bucket → Properties → Event notifications
 * 2. Create event notification:
 *    - Event type: PUT
 *    - Prefix: garments/ (or other paths to optimize)
 *    - Suffix: .jpg, .jpeg, .png, .webp
 *    - Destination: Lambda function (optimize-s3-images)
 */

/**
 * Alternative: Use S3 Object Lambda
 * 
 * S3 Object Lambda can optimize images on-the-fly when requested:
 * - No need to overwrite originals
 * - Supports different formats per request
 * - More flexible but higher cost
 */

export const LAMBDA_OPTIMIZER_CONFIG = {
  functionName: "optimize-s3-images",
  runtime: "nodejs20.x",
  memorySize: 1024,
  timeout: 30,
  optimizePaths: ["garments/", "model-references/"],
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 85,
};

/**
 * Check if image should be optimized based on S3 key
 */
export function shouldOptimizeImage(key: string): boolean {
  const optimizePaths = LAMBDA_OPTIMIZER_CONFIG.optimizePaths;
  return optimizePaths.some((path) => key.startsWith(path));
}

