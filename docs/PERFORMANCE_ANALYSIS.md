# Watermarking Performance Analysis

## Current Implementation: Next.js API Routes

### Architecture
- **Endpoint**: `/api/images/[id]/watermarked`
- **Processing**: On-the-fly watermarking using Sharp
- **Deployment**: Vercel serverless functions
- **Timeout**: 30 seconds (configured in `vercel.json`)

### Request Flow
1. **Authentication & Authorization** (~50-100ms)
   - Clerk auth check
   - User lookup in MongoDB
   - Ownership verification

2. **Database Query** (~10-50ms)
   - Fetch generation/render record
   - Indexed queries (fast)

3. **S3 Image Fetch** (~100-300ms)
   - Network latency to S3
   - Image download (varies by size)

4. **Watermark Processing** (~100-500ms)
   - Sharp image processing
   - SVG watermark overlay
   - JPEG encoding

5. **Response** (~10-50ms)
   - Return watermarked image
   - Cache headers set

**Total Latency**: ~270-1000ms per request

---

## Performance Assessment

### ✅ **Works Well For:**

1. **MVP Stage** (Current)
   - Low to medium traffic (< 1000 requests/day)
   - Acceptable latency for preview images
   - Simple implementation

2. **Caching Benefits**
   - Cache headers: `max-age=31536000` (1 year)
   - Browser caching reduces repeat requests
   - CDN caching (if CloudFront configured) helps significantly

3. **Rate Limiting**
   - Current: 20 requests per 15 minutes per user
   - Prevents abuse and excessive function invocations

4. **Sharp Performance**
   - Efficient native image processing
   - Fast watermarking (~100-500ms for typical images)

### ⚠️ **Potential Issues:**

1. **Cold Starts**
   - First request after inactivity: +500-2000ms
   - Subsequent requests: Normal latency
   - **Impact**: Noticeable delay for first user after inactivity

2. **Concurrent Requests**
   - Each request = separate function invocation
   - 10 concurrent users = 10 function instances
   - **Cost**: Scales with concurrent usage

3. **Large Images**
   - 4K images: ~1-3 seconds processing
   - 8K images: ~3-5 seconds processing
   - **Risk**: May approach 30s timeout for very large images

4. **Vercel Limits**
   - **Hobby Plan**: 10s timeout, 100GB bandwidth/month
   - **Pro Plan**: 60s timeout, 1TB bandwidth/month
   - **Enterprise**: Custom limits

5. **Cost at Scale**
   - Serverless function invocations: ~$0.20 per million
   - Bandwidth: ~$0.10 per GB
   - **Example**: 10,000 requests/day = ~$0.60/month (functions) + bandwidth

---

## Performance Optimization Strategies

### 1. **Immediate Optimizations (No Code Changes)**

#### A. Enable Vercel Edge Caching
```json
// vercel.json
{
  "headers": [
    {
      "source": "/api/images/(.*)/watermarked",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### B. Use Vercel Edge Functions (Recommended)
- Move watermarking to Edge Functions
- Lower latency (edge locations)
- Better cold start performance
- **Migration**: Convert API route to Edge Function

#### C. Configure CloudFront CDN
- Point CloudFront to Vercel deployment
- Cache watermarked images at edge
- Reduces function invocations significantly

### 2. **Code-Level Optimizations**

#### A. Add Response Caching
```typescript
// Cache watermarked images in memory/Redis
const cacheKey = `watermarked:${id}:${type}`;
const cached = await redis.get(cacheKey);
if (cached) return new NextResponse(cached, { headers: {...} });
```

#### B. Optimize Image Fetching
```typescript
// Use S3 presigned URLs with longer expiration
// Fetch with compression headers
const imageResponse = await fetch(imageUrl, {
  headers: {
    "Accept-Encoding": "gzip, deflate",
  },
});
```

#### C. Lazy Watermarking
- Pre-generate watermarked versions for popular images
- Store in S3 with `-watermarked` suffix
- Serve pre-generated if exists, else generate on-the-fly

### 3. **Architecture Improvements**

#### A. Background Job Processing
- Queue watermarking requests
- Process in background workers
- Store results in S3
- Serve from S3 (fast, no processing)

#### B. Lambda@Edge (Future)
- Move to AWS Lambda@Edge
- Process at CloudFront edge
- Automatic caching
- Lower costs at scale

---

## When to Migrate to Lambda@Edge

### **Stay with Next.js API Routes If:**
- ✅ Traffic < 10,000 requests/day
- ✅ Average image size < 2MB
- ✅ Budget constraints
- ✅ Team prefers Next.js ecosystem

### **Migrate to Lambda@Edge If:**
- ⚠️ Traffic > 50,000 requests/day
- ⚠️ Average image size > 5MB
- ⚠️ Global user base (need edge locations)
- ⚠️ Cost optimization needed at scale
- ⚠️ Latency critical (< 200ms)

---

## Performance Benchmarks

### Current Implementation (Next.js API Route)

| Metric | Value | Notes |
|--------|-------|-------|
| **Cold Start** | 500-2000ms | First request after inactivity |
| **Warm Request** | 270-1000ms | Subsequent requests |
| **Image Size** | 500KB-2MB | Typical generation output |
| **Processing Time** | 100-500ms | Sharp watermarking |
| **S3 Fetch** | 100-300ms | Network latency |
| **Concurrent Capacity** | ~1000 req/min | Vercel Pro plan |

### Expected with Lambda@Edge

| Metric | Value | Notes |
|--------|-------|-------|
| **Cold Start** | 50-200ms | Edge locations |
| **Warm Request** | 50-150ms | Cached at edge |
| **Processing Time** | 100-500ms | Same (Sharp) |
| **S3 Fetch** | 50-150ms | Edge to S3 (same region) |
| **Concurrent Capacity** | ~10,000 req/min | Auto-scaling |

---

## Recommendations

### **For MVP (Current Stage):**
✅ **Keep Next.js API Routes**
- Simple and maintainable
- Sufficient for current traffic
- Easy to debug and monitor
- Can optimize later if needed

### **Optimizations to Apply Now:**
1. ✅ **Enable Vercel Edge Functions** (easy migration)
2. ✅ **Configure CloudFront CDN** (if not already done)
3. ✅ **Add Redis caching** (optional, for high-traffic images)
4. ✅ **Monitor function duration** (set up alerts for > 5s)

### **Future Migration Path:**
1. Monitor traffic and costs
2. If traffic > 10K requests/day → Consider Lambda@Edge
3. If latency becomes issue → Migrate to Lambda@Edge
4. If costs spike → Migrate to Lambda@Edge

---

## Cost Analysis

### Next.js API Routes (Vercel Pro)
- **Function Invocations**: $0.20 per million
- **Bandwidth**: $0.10 per GB
- **Example (10K requests/day)**:
  - Functions: ~300K/month = $0.06
  - Bandwidth: ~50GB/month = $5.00
  - **Total**: ~$5.06/month

### Lambda@Edge (AWS)
- **Requests**: $0.60 per million
- **Compute**: $0.00000625 per GB-second
- **Data Transfer**: $0.085 per GB
- **Example (10K requests/day)**:
  - Requests: ~300K/month = $0.18
  - Compute: ~$0.50
  - Data Transfer: ~$4.25
  - **Total**: ~$4.93/month

**Note**: Lambda@Edge becomes cheaper at higher scale (> 100K requests/day)

---

## Conclusion

**Current Next.js API Route approach is sufficient for MVP stage.**

**Performance Impact:**
- ✅ Acceptable latency (270-1000ms)
- ✅ Good caching strategy
- ✅ Rate limiting prevents abuse
- ⚠️ Cold starts noticeable but acceptable
- ⚠️ Cost scales linearly with traffic

**Action Items:**
1. Monitor function duration and errors
2. Set up CloudFront CDN if not already configured
3. Consider Edge Functions migration (easy win)
4. Plan Lambda@Edge migration when traffic > 10K/day

