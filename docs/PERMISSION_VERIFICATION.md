# Generation vs Download Permissions - Verification

## 🔍 Current Implementation vs Requirements

### Generation Permission (`app/api/render/route.ts`)

#### AI Models (Current Implementation ✅)
```typescript
// Lines 144-170
- ✅ Checks BusinessProfile exists
- ✅ Checks subscription status (via canGenerate())
- ✅ Checks aiCreditsRemaining >= 1
- ✅ Blocks if subscriptionStatus === 'past_due'
- ✅ Deducts 1 credit on success
- ✅ Applies watermark for free tier only
```

**Status: ✅ CORRECT** - Matches requirements

#### Human Models (Current Implementation ⚠️)
```typescript
// Lines 114-143
- ⚠️ REQUIRES consent (checkConsentStatus) - Line 116
- ✅ Does NOT require purchase
- ✅ Does NOT require credits
- ✅ Always applies watermark (unless purchased)
```

**Status: ⚠️ DISCREPANCY** - Currently requires consent, but requirements say:
> "Businesses can check the human models by generating images"
> "Consent only required for purchase"

**Should be:**
- ❌ Does NOT require consent for generation
- ✅ Does NOT require purchase for generation
- ✅ Always watermarked (unless purchased)

---

### Download Permission (`app/api/render/download/route.ts`)

#### AI Models (Current Implementation ⚠️)
```typescript
// Lines 125-159
- ✅ Checks ownership
- ✅ No subscription tier restriction (both free and paid can download)
- ⚠️ Watermark removal logic needs to be added at download stage
```

**Status: ⚠️ NEEDS FIX** - Requirements:
> "In generation stage, no matter the subscription package or AI or Human model, watermark should be there"
> "Only in the download stage watermark removes according to subscription package, purchase and consent fulfillments"

**Required behavior:**
- ✅ Both free and paid users can download
- ⚠️ **Generation**: ALL images watermarked (regardless of subscription)
- ⚠️ **Download**: Remove watermark for paid tier users, keep for free tier users

#### Human Models (Current Implementation ✅)
```typescript
// Lines 93-121
- ✅ Checks ownership
- ✅ Checks if model is in purchasedModels[]
- ✅ Blocks with PURCHASE_REQUIRED error if not purchased
```

**Status: ✅ CORRECT** - Matches requirements

---

## 📋 Summary of Discrepancies

### Issue 1: Human Model Generation Requires Consent (NEEDS FIX)
**Current:** Generation requires consent approval
**Required:** Generation should NOT require consent (consent only for purchase)

**Location:** `app/api/render/route.ts` lines 114-128

**Fix Needed:**
- Remove consent check from generation endpoint
- Consent should only be checked in purchase checkout endpoint

### Issue 2: Watermark Logic - Generation vs Download (NEEDS FIX)
**Current:** Watermark applied/not applied during generation based on subscription/purchase
**Required:** 
- **Generation**: ALWAYS apply watermark (all images)
- **Download**: Remove watermark based on permissions

**Location:** 
- `app/api/render/route.ts` - Generation watermark logic
- `lib/render-queue-processor.ts` - Queue processor watermark logic
- `app/api/render/[id]/retry/route.ts` - Retry watermark logic
- `app/api/render/download/route.ts` - Download watermark removal logic

**Fix Needed:**
1. Update generation endpoints to ALWAYS apply watermark
2. Add watermark removal logic in download endpoint based on:
   - AI Models: Remove if `subscriptionTier !== 'free'`
   - Human Models: Remove if model is in `purchasedModels[]`

---

## ✅ Correct Flow (As Per Requirements)

### Generation Flow

**AI Models:**
1. ✅ Check subscription status (active)
2. ✅ Check credits >= 1
3. ✅ Generate (watermarked if free tier)
4. ✅ Deduct credit

**Human Models:**
1. ❌ ~~Check consent~~ (REMOVE - not required for generation)
2. ✅ Generate (always watermarked unless purchased)
3. ✅ No credits deducted
4. ✅ No purchase required

### Download Flow

**AI Models:**
1. ✅ Check ownership
2. ✅ Allow download for both free and paid users
3. ✅ **Generation**: Always apply watermark (stored watermarked)
4. ✅ **Download**: 
   - Free tier: Return watermarked image (as stored)
   - Paid tier: Remove watermark before returning

**Human Models:**
1. ✅ Check ownership
2. ✅ Check purchase status (block if not purchased)
3. ✅ **Generation**: Always apply watermark (stored watermarked)
4. ✅ **Download**: Remove watermark if purchased, keep if not purchased

---

## 🔧 Required Changes

### Change 1: Remove Consent Check from Generation
**File:** `app/api/render/route.ts`
**Lines:** 114-128
**Action:** Remove consent check, allow generation without consent

### Change 2: Fix Watermark Logic - Generation Always, Download Conditional
**Files to Update:**
1. `app/api/render/route.ts` - Always apply watermark during generation
2. `lib/render-queue-processor.ts` - Always apply watermark during generation
3. `app/api/render/[id]/retry/route.ts` - Always apply watermark during generation
4. `app/api/render/download/route.ts` - Add watermark removal logic:
   - AI Models: Remove watermark if `subscriptionTier !== 'free'`
   - Human Models: Remove watermark if model is purchased

**Action:**
- Remove conditional watermark logic from generation endpoints
- Always apply watermark during generation/storage
- Add watermark removal logic in download endpoint based on permissions

### Change 3: Update Batch Render (if needed)
**File:** `app/api/render/batch/route.ts`
**Action:** Remove consent check from batch generation

### Change 4: Update Queue Processor (if needed)
**File:** `lib/render-queue-processor.ts`
**Action:** Remove consent check from queue processing

---

## 📝 Notes

- **Consent Flow:** Should only be checked in `/api/models/purchase/checkout` when `consentRequired === true`
- **Purchase Flow:** Consent is a prerequisite for purchase, not for generation
- **Preview Purpose:** Generation is meant to allow businesses to "check" human models before purchasing

