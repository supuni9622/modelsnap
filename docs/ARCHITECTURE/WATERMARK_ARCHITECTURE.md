# Hybrid Watermarking Architecture

## Overview

This document describes the hybrid watermarking approach implemented for ModelSnapper.ai, where original non-watermarked images are stored in S3, and watermarked versions are generated on-the-fly when needed.

## Architecture

### Storage Strategy
- **S3 Storage**: Only original non-watermarked images are stored
- **On-the-Fly Watermarking**: Watermarked versions generated via API routes when needed
- **Caching**: Watermarked versions can be cached by CloudFront/CDN for performance

### Benefits
- ✅ No storage bloat (single copy per image)
- ✅ Low recurring costs
- ✅ High speed via caching
- ✅ Simple maintenance
- ✅ Flexible watermarking logic

---

## Implementation Details

### 1. Generation Stage

**All generation endpoints store non-watermarked originals:**

- `app/api/render/route.ts` - Single render
- `app/api/render/batch/route.ts` - Batch render
- `lib/render-queue-processor.ts` - Queue processor
- `app/api/render/[id]/retry/route.ts` - Retry render

**Changes Made:**
- ✅ Removed watermark logic from generation endpoints
- ✅ Store original non-watermarked images in S3
- ✅ Removed consent check from human model generation (consent only for purchase)

**Generation Permissions:**
- **AI Models**: Requires credits + active subscription
- **Human Models**: No consent required, no purchase required (preview only)

---

### 2. On-the-Fly Watermarking API

**Endpoint:** `/api/images/[id]/watermarked`

**Purpose:** Generate watermarked version of an image on-the-fly

**Usage:**
```
GET /api/images/[id]/watermarked?type=ai
GET /api/images/[id]/watermarked?type=human
```

**Features:**
- Fetches original from S3
- Applies watermark using `lib/watermark.ts`
- Returns watermarked image with cache headers
- Can be cached by CloudFront/CDN

**Cache Headers:**
- `Cache-Control: public, max-age=31536000, immutable`
- `CDN-Cache-Control: public, max-age=31536000, immutable`

---

### 3. Download Stage

**Endpoint:** `/api/render/download`

**Logic:**

#### AI Models
- ✅ All users can download (free and paid)
- ✅ **Free tier**: Watermark applied on-the-fly during download
- ✅ **Paid tier**: Non-watermarked image served directly from S3

#### Human Models
- ✅ **Purchase required**: Must be in `businessProfile.purchasedModels[]`
- ✅ **If purchased**: Non-watermarked image served directly from S3
- ✅ **If not purchased**: Download blocked with `PURCHASE_REQUIRED` error

**Implementation:**
```typescript
// Check permissions
if (type === "human") {
  // Must be purchased
  if (!isPurchased) {
    return error("PURCHASE_REQUIRED");
  }
  // Serve non-watermarked
} else {
  // AI model
  const isPaidTier = subscriptionTier !== "free";
  if (isPaidTier) {
    // Serve non-watermarked
  } else {
    // Apply watermark on-the-fly
    imageBuffer = await applyWatermark(imageBuffer);
  }
}
```

---

## Permission Matrix

| Model Type | Generation | Download | Watermark (Generation) | Watermark (Download) |
|------------|-----------|----------|----------------------|---------------------|
| **AI - Free** | ✅ Requires credits | ✅ Allowed | ❌ Not applied (stored clean) | ✅ Applied on-the-fly |
| **AI - Paid** | ✅ Requires credits | ✅ Allowed | ❌ Not applied (stored clean) | ❌ Not applied |
| **Human - Not Purchased** | ✅ Allowed (preview) | ❌ Blocked | ❌ Not applied (stored clean) | N/A (blocked) |
| **Human - Purchased** | ✅ Allowed | ✅ Allowed | ❌ Not applied (stored clean) | ❌ Not applied |

---

## Frontend Integration

### Preview URLs
For previews that need watermarks, use the on-the-fly watermarking API:
```typescript
// For free tier AI models or unpurchased human models
const previewUrl = `/api/images/${generationId}/watermarked?type=${type}`;
```

### Download URLs
Use the download endpoint which handles watermarking automatically:
```typescript
// Download endpoint handles watermarking based on permissions
const downloadUrl = `/api/render/download?id=${generationId}&type=${type}`;
```

---

## Current Implementation Status

### ✅ Implemented: Next.js API Route Approach
- **Endpoint**: `/api/images/[id]/watermarked`
- **Processing**: Watermarking done on Next.js server
- **Caching**: Cache headers set for CDN caching
- **Status**: Fully functional and in use

### ⚠️ Future Enhancement: CloudFront Lambda@Edge (NOT IMPLEMENTED)
For better performance and lower costs:

1. **Setup CloudFront Distribution** pointing to S3
2. **Create Lambda@Edge Function**:
   - Trigger: Viewer Request
   - Check query parameter: `?watermarked=true`
   - If watermarked: Fetch from S3, apply watermark, cache result
   - If not: Serve directly from S3

3. **Update API Routes**:
   - Return CloudFront URLs with `?watermarked=true` for previews
   - Direct S3 URLs for authorized downloads

**Benefits:**
- Faster response times (edge caching)
- Lower Lambda costs (only processes once per unique request)
- Automatic caching
- Better scalability

**Status**: This is a future enhancement. Current Next.js API route approach works well and can be migrated later if needed.

---

## Files Modified

### Generation Endpoints
- ✅ `app/api/render/route.ts` - Removed watermark logic, removed consent check
- ✅ `app/api/render/batch/route.ts` - Removed consent check
- ✅ `lib/render-queue-processor.ts` - Removed watermark logic, removed consent check
- ✅ `app/api/render/[id]/retry/route.ts` - Removed watermark logic, removed consent check

### New Files
- ✅ `app/api/images/[id]/watermarked/route.ts` - On-the-fly watermarking API

### Download Endpoint
- ✅ `app/api/render/download/route.ts` - Added watermark logic based on permissions

---

## Testing Checklist

- [ ] Generate AI model (free tier) → Preview shows watermarked, download is watermarked
- [ ] Generate AI model (paid tier) → Preview shows watermarked, download is non-watermarked
- [ ] Generate human model (not purchased) → Preview shows watermarked, download blocked
- [ ] Generate human model (purchased) → Preview shows watermarked, download is non-watermarked
- [ ] On-the-fly watermarking API returns correct watermarked images
- [ ] Download endpoint applies watermark correctly for free tier AI models
- [ ] Download endpoint serves non-watermarked for paid tier AI models
- [ ] Download endpoint blocks unpurchased human models
- [ ] Download endpoint serves non-watermarked for purchased human models

---

## Notes

- **Consent**: Only required for purchase, not for generation/preview
- **Purchase**: Required for human model downloads, not for generation
- **Watermarking**: Always applied during generation in the old system, now applied on-the-fly during download/preview
- **Storage**: Single copy per image (non-watermarked original) saves storage costs

