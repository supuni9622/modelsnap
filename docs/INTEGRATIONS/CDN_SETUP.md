@# CDN Setup Guide for ModelSnap.ai

This guide explains how to set up CloudFront CDN for optimized image delivery.

## Overview

ModelSnap.ai uses AWS CloudFront CDN to deliver images globally with:
- **Faster load times**: Images served from edge locations closest to users
- **Reduced bandwidth costs**: Lower data transfer costs
- **Better caching**: Aggressive caching for immutable images
- **Global distribution**: Images available worldwide

## Prerequisites

- AWS Account
- S3 bucket configured
- CloudFront distribution (or use existing)

## Setup Steps

### 1. Create CloudFront Distribution

1. Go to AWS CloudFront Console
2. Create a new distribution
3. Configure:
   - **Origin Domain**: Your S3 bucket (e.g., `modelsnap-images.s3.amazonaws.com`)
   - **Origin Path**: Leave empty (or set if using subfolder)
   - **Origin Access**: Use Origin Access Control (OAC) or Origin Access Identity (OAI)
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP Methods**: GET, HEAD, OPTIONS
   - **Cache Policy**: Use "CachingOptimized" or custom policy
   - **Compress Objects Automatically**: Yes

### 2. Configure Cache Behavior

For optimal performance, configure different cache behaviors:

#### Images (Long Cache)
- **Path Pattern**: `generated/*`, `garments/*`, `model-references/*`
- **Cache Policy**: Custom
  - **TTL**: 1 year (31536000 seconds)
  - **Headers**: Cache-Control, Origin
  - **Query Strings**: None
- **Compression**: Enabled

#### General Files
- **Path Pattern**: `*`
- **Cache Policy**: CachingOptimized
- **TTL**: 1 hour (3600 seconds)

### 3. Environment Variables

Add to your `.env` file:

```env
# CloudFront CDN Domain (without https://)
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# Optional: Custom public URL (if not using CloudFront)
# AWS_S3_PUBLIC_URL=https://cdn.modelsnap.ai
```

### 4. S3 Bucket Policy

Update your S3 bucket policy to allow CloudFront access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

### 5. Cache Headers

Images uploaded via `uploadToS3()` automatically include:
- `Cache-Control: public, max-age=31536000, immutable` for images
- `Cache-Control: public, max-age=3600` for other files

These headers are respected by CloudFront.

## Image Optimization

All images are automatically optimized before upload:

- **Compression**: JPEG quality 85-90%
- **Resizing**: Max 2048x2048px (maintains aspect ratio)
- **Format**: JPEG (with WebP support available)
- **Metadata**: Stripped for privacy and smaller file size

## Testing

1. Upload an image via the API
2. Check the returned URL - it should use CloudFront domain
3. Verify cache headers in browser DevTools
4. Test from different geographic locations

## Monitoring

Monitor CloudFront metrics:
- **Cache Hit Ratio**: Should be > 90%
- **Data Transfer**: Monitor bandwidth usage
- **Error Rates**: Watch for 4xx/5xx errors
- **Latency**: P50/P95 latency metrics

## Cost Optimization

- Use CloudFront's free tier (1TB data transfer/month)
- Enable compression to reduce bandwidth
- Use appropriate cache TTLs
- Consider S3 Intelligent-Tiering for storage

## Troubleshooting

### Images not loading
- Check CloudFront distribution status
- Verify S3 bucket policy allows CloudFront
- Check CORS settings if needed

### Cache not working
- Verify Cache-Control headers are set
- Check CloudFront cache policy settings
- Clear CloudFront cache if needed

### Slow performance
- Check CloudFront edge location selection
- Verify compression is enabled
- Monitor origin response times

## Alternative CDNs

If not using CloudFront, you can use:
- **Cloudflare**: Set `AWS_S3_PUBLIC_URL` to Cloudflare domain
- **Fastly**: Configure Fastly backend to S3
- **Other CDNs**: Update `getS3PublicUrl()` function accordingly

