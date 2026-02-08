# Image Optimization Guide

ModelSnapper.ai automatically optimizes all images before uploading to S3, reducing file sizes by 40-70% while maintaining visual quality.

## Features

### Automatic Optimization
- **Compression**: JPEG quality 85-90% (configurable)
- **Resizing**: Max dimensions 2048x2048px (maintains aspect ratio)
- **Format Conversion**: Supports JPEG, PNG, WebP, AVIF
- **Metadata Stripping**: Removes EXIF data for privacy and smaller files

### Optimization Profiles

#### Garment Images
- Max size: 1920x1920px
- Quality: 90% (higher quality for product photos)
- Format: JPEG (progressive)

#### Model Reference Images
- Max size: 1600x1600px
- Quality: 88%
- Format: JPEG (progressive)

#### Generated Images
- Max size: 2048x2048px
- Quality: 85% (balanced)
- Format: JPEG (progressive)

## Usage

### Server-Side Upload (Automatic)

Images uploaded via server-side endpoints are automatically optimized:

```typescript
import { uploadToS3, generateS3Key } from "@/lib/s3";
import { optimizeGeneratedImage, getMimeType } from "@/lib/image-optimization";

// Optimize image
const optimized = await optimizeGeneratedImage(imageBuffer);

// Upload optimized image
const url = await uploadToS3(
  s3Key,
  optimized.buffer,
  getMimeType(optimized.format),
  {
    optimize: false, // Already optimized
    cacheControl: "public, max-age=31536000, immutable",
  }
);
```

### Client-Side Upload (Pre-signed URLs)

For client-side uploads via pre-signed URLs, you have two options:

#### Option 1: Server-Side Optimization Endpoint

Use `/api/upload/optimize` to optimize before upload:

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("type", "garment"); // or "model-reference", "generated"

const response = await fetch("/api/upload/optimize", {
  method: "POST",
  body: formData,
});

const { url, optimizedSize, compressionRatio } = await response.json();
```

#### Option 2: Lambda Function (Recommended for Production)

Set up an AWS Lambda function to optimize images after upload:

1. Create Lambda function triggered by S3 PutObject events
2. Function optimizes images and overwrites originals
3. See `lib/s3-lambda-optimizer.ts` for reference implementation

## CDN Integration

### CloudFront Setup

1. Create CloudFront distribution pointing to S3 bucket
2. Set environment variable: `AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net`
3. All image URLs automatically use CDN

### Cache Headers

Images include optimal cache headers:
- **Images**: `Cache-Control: public, max-age=31536000, immutable` (1 year)
- **Other files**: `Cache-Control: public, max-age=3600` (1 hour)

### Benefits

- **Faster Load Times**: Images served from edge locations
- **Reduced Bandwidth**: Lower data transfer costs
- **Global Distribution**: Images available worldwide
- **Better Caching**: Aggressive caching for immutable images

## Performance Metrics

Typical optimization results:
- **File Size Reduction**: 40-70%
- **Load Time Improvement**: 50-80% faster
- **Bandwidth Savings**: Significant cost reduction

## Configuration

### Environment Variables

```env
# CloudFront CDN Domain (optional)
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# Custom public URL (optional, if not using CloudFront)
AWS_S3_PUBLIC_URL=https://cdn.modelsnap.ai
```

### Custom Optimization Options

```typescript
import { optimizeImage } from "@/lib/image-optimization";

const optimized = await optimizeImage(buffer, {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 90,
  format: "jpeg",
  progressive: true,
  stripMetadata: true,
});
```

## Best Practices

1. **Always optimize before upload**: Reduces storage and bandwidth costs
2. **Use appropriate quality settings**: Higher quality for product photos
3. **Strip metadata**: Protects user privacy and reduces file size
4. **Use CDN**: Significantly improves load times globally
5. **Set cache headers**: Aggressive caching for immutable images

## Troubleshooting

### Images too large
- Reduce `maxWidth` and `maxHeight`
- Lower `quality` setting
- Use WebP format for better compression

### Quality too low
- Increase `quality` setting (85-95)
- Don't resize if original is already small
- Use PNG for images with transparency

### Optimization fails
- Check image format is supported
- Verify sharp library is installed
- Check file size limits

