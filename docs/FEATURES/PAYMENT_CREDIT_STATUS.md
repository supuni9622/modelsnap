# Payment and Credit System - Implementation Status

## 📊 Summary

**Backend Status: ~98% Complete** ✅
- ✅ Subscription & credit management system
- ✅ Model purchase system (backend)
- ✅ Hybrid watermarking system (Next.js API routes)
- ✅ Download permission enforcement
- ✅ Stripe webhook handlers
- ✅ On-the-fly watermarking API (`/api/images/[id]/watermarked`)
- ✅ Generation endpoints return preview URLs (watermarked) and original URLs

**Frontend Status: ~60% Complete** ✅
- ⚠️ Purchase button components (partially complete)
- ✅ Download button updates (purchase checks implemented)
- ⚠️ Purchase status displays (partially complete)
- ✅ Update frontend to use `previewImageUrl` for display
- ✅ History views display watermarked images correctly

**Payout System: Needs Update** ⚠️
- ⚠️ Update to use `availableBalance` instead of `royaltyBalance`

**CloudFront Lambda@Edge: NOT IMPLEMENTED** ✅
- ✅ **Decision**: Using Next.js API routes + Vercel for MVP
- ✅ **Performance**: Acceptable for current traffic (< 10K requests/day)
- ✅ **Optimization**: Cache headers configured in `vercel.json`
- 📋 **Future**: Lambda@Edge can be considered when traffic > 50K requests/day

---

## ✅ COMPLETED (Backend & Core Infrastructure)

### 1. Database Schema & Models
- ✅ **BusinessProfile Schema** - Updated with all subscription and credit fields:
  - `subscriptionTier` (free/starter/growth)
  - `aiCreditsRemaining` & `aiCreditsTotal`
  - `stripeSubscriptionId` & `subscriptionCurrentPeriodEnd`
  - `subscriptionStatus` (active/past_due/canceled/trialing)
  - `lastCreditReset` & `creditResetDay`
  - `purchasedModels` array (for human model purchases)
  - `approvedModels` array (for consent-approved models)
  - All necessary indexes added

- ✅ **ModelProfile Schema** - Updated with purchase fields:
  - `approvedBusinesses` array
  - `royaltyBalance` (kept for backward compatibility, but not used for generations)
  - ✅ `price` field (model purchase price in cents)
  - ✅ `availableBalance` field (90% of purchase price - total earnings from purchases)
  - ✅ `consentRequired` field (boolean - whether consent needed before purchase)

- ✅ **ModelPurchase Model** (`models/model-purchase.ts`):
  - `businessId` (ref: BusinessProfile)
  - `modelId` (ref: ModelProfile)
  - `stripePaymentIntentId` & `stripeCheckoutSessionId`
  - `amount`, `platformCommission` (10%), `modelEarnings` (90%)
  - `status` (pending/completed/failed/refunded)
  - `purchasedAt`, `completedAt`
  - All necessary indexes added

### 2. Payment Provider Configuration
- ✅ Changed `paymentProvider` from `lemonsqueezy` to `stripe` in `lib/config/pricing.ts`
- ✅ Stripe checkout API exists at `/api/stripe/checkout`

### 3. Stripe Webhook Handlers
- ✅ `checkout.session.completed` - Handles subscription starts and updates BusinessProfile
- ✅ `invoice.paid` - Resets credits on monthly subscription renewal (`billing_reason === 'subscription_cycle'`)
- ✅ `customer.subscription.updated` - Handles plan upgrades/downgrades
- ✅ `customer.subscription.deleted` - Downgrades to free tier on cancellation
- ✅ `invoice.payment_failed` - Sets subscription status to `past_due`
- ✅ **Model Purchase Webhook Handler** - Handles `checkout.session.completed` for model purchases:
  - Detects model purchase via metadata (`type === "model_purchase"`)
  - Creates/updates `ModelPurchase` record
  - Adds model to `businessProfile.purchasedModels`
  - Updates `modelProfile.availableBalance` (90% of purchase price)
  - Platform commission handling (10%)

### 4. Credit Management System
- ✅ **Credit Utilities** (`lib/credit-utils.ts`):
  - `getCreditsForPlan()` - Get credit limit for plan
  - `resetFreeTierCredits()` - Reset free tier credits
  - `checkAndResetFreeCredits()` - Auto-reset check before deduction
  - `deductCredit()` - Atomic credit deduction
  - `canGenerate()` - Check if user can generate (credits + subscription status)

- ✅ **Free Tier Cron Job** (`/api/cron/reset-free-credits`):
  - Configured in `vercel.json` to run daily at midnight UTC
  - Resets free tier credits after 30 days

### 5. Credit Deduction Logic
- ✅ Updated `app/api/render/route.ts`:
  - Uses `BusinessProfile.aiCreditsRemaining` instead of `User.credits`
  - Checks subscription status (blocks if `past_due`)
  - Auto-resets free tier credits if 30 days passed
  - Removed royalty logic for human models

- ✅ Updated `app/api/render/batch/route.ts`:
  - Same credit deduction logic as single render
  - Removed royalty logic

### 6. BusinessProfile Initialization
- ✅ Updated `app/api/user/role/route.ts` - Creates BusinessProfile with all new fields when role set to BUSINESS
- ✅ Updated `app/api/business/profile/route.ts` - Initializes all new fields on profile creation

### 7. Consent Flow (Already Exists)
- ✅ Consent request system (`/api/consent`)
- ✅ Consent approval/rejection (`/api/consent/[id]`)
- ✅ Model approval workflow
- ✅ Frontend components for consent management

### 8. Model Purchase System (Backend)
- ✅ **ModelPurchase Model** - Created with all required fields
- ✅ **ModelProfile Updates** - Added `price`, `availableBalance`, `consentRequired`
- ✅ **Purchase Checkout API** (`/api/models/purchase/checkout`):
  - Creates Stripe checkout session for model purchase
  - Validates consent status (if `consentRequired === true`)
  - Calculates 10% platform commission and 90% model earnings
  - Creates pending purchase record
- ✅ **Purchase Status API** (`/api/models/[id]/purchase-status`):
  - Checks if business has purchased a specific model
  - Returns purchase status and metadata
- ✅ **Stripe Webhook Handler** - Processes model purchase one-time payments

### 9. Hybrid Watermarking System (Implemented)
- ✅ **Architecture**: Store original non-watermarked images in S3, generate watermarked versions on-the-fly
- ✅ **On-the-Fly Watermarking API** (`/api/images/[id]/watermarked`):
  - Fetches original from S3
  - Applies watermark using `lib/watermark.ts`
  - Returns watermarked image with cache headers
  - Supports both AI and Human model types
  - Includes ownership verification
- ✅ **Generation Endpoints Updated**:
  - `app/api/render/route.ts` - Stores non-watermarked originals, returns `previewImageUrl` (watermarked endpoint)
  - `app/api/render/batch/route.ts` - Same approach
  - `lib/render-queue-processor.ts` - Same approach
  - `app/api/render/[id]/retry/route.ts` - Same approach
- ✅ **Generation Response Updated**:
  - Returns `previewImageUrl` pointing to `/api/images/[id]/watermarked?type=ai|human` for display
  - Returns `outputS3Url` for original non-watermarked image (for download)
- ✅ **Updated `/api/generations`**:
  - Returns both `previewImageUrl` (watermarked) and `outputS3Url` (original) for all generations

### 10. Download Permission Logic (Backend)
- ✅ **Updated `/api/render/download`**:
  - **AI Models**: Free tier gets watermarked on-the-fly, paid tiers get non-watermarked
  - **Human Models**: Blocks download if model not purchased, serves non-watermarked if purchased
  - Returns appropriate error messages with `PURCHASE_REQUIRED` code

---

## ❌ REMAINING (Frontend & Payout Updates)

### Watermarking Implementation Status

**Current Implementation:**
- ✅ **Next.js API Route**: `/api/images/[id]/watermarked` - Fully implemented
- ✅ **On-the-Fly Processing**: Watermarks applied via Next.js API route
- ✅ **Cache Headers**: Set for CDN caching (`Cache-Control: public, max-age=31536000, immutable`)
- ⚠️ **CloudFront Lambda@Edge**: NOT implemented (future enhancement)

**Watermark Logic Rules:**
```
Display/Preview:
- All images shown to users are watermarked (via /api/images/[id]/watermarked endpoint)

Download:
AI Models:
- Free tier: ✅ Watermarked (applied on-the-fly during download)
- Paid tiers (starter/growth): ❌ Not watermarked (served directly from S3)

Human Models:
- Not purchased: ❌ Download blocked
- Purchased: ❌ Not watermarked (served directly from S3)
```

**CloudFront Lambda@Edge Status:**
- ❌ **NOT IMPLEMENTED** - Currently using Next.js API routes
- 📋 **Future Enhancement**: Documented in `docs/ARCHITECTURE/WATERMARK_ARCHITECTURE.md`
- 💡 **Recommendation**: Can be implemented later for better performance and lower costs

### 1. Frontend Download Buttons
- ❌ Update `components/dashboard/business/generate-form.tsx`:
  - Disable download button for unpurchased human models
  - Show "Purchase Required" tooltip/message
  - Show purchase button if not purchased

- ✅ Update `components/dashboard/business/history-list.tsx`:
  - ✅ Uses `previewImageUrl` for displaying watermarked images
  - ✅ Constructs watermarked URL if `previewImageUrl` not available
  - ✅ Checks purchase status for each human model generation
  - ✅ Conditionally disables download button
  - ✅ Shows purchase prompt when needed

- ✅ Update `components/platform/history/render-history.tsx`:
  - ✅ Uses `previewImageUrl` for displaying watermarked images
  - ✅ Constructs watermarked URL if `previewImageUrl` not available
  - ✅ Same download permission checks
  - ✅ Conditional button rendering

### 2. Frontend Model Purchase UI

#### 4.1 Model Marketplace/Profile View
- ❌ **Purchase Button Component**:
  - Show purchase button on model profile page
  - Check consent status first (if `consentRequired === true`)
  - Show price and commission breakdown
  - Handle Stripe checkout redirect

- ❌ **Purchase Status Display**:
  - Show "Purchased" badge if already purchased
  - Show "Purchase Required" if not purchased
  - Show consent request status if consent required

#### 4.2 Purchase Flow UI
- ❌ **Consent + Purchase Flow**:
  - If consent required: Show consent request button first
  - After consent approved: Show purchase button
  - Handle purchase completion redirect
  - Show success message

### 3. Model Earnings & Payouts Updates

#### 3.1 Earnings Tracking
- ✅ `availableBalance` field exists in ModelProfile
- ✅ Earnings updated when purchase completes (via webhook):
  - 90% of purchase price added to `modelProfile.availableBalance`
  - Transaction tracked in `ModelPurchase` record

#### 3.2 Payout System Updates
- ✅ Payout request system exists (`/api/model/payout/request`)
- ⚠️ **NEEDS UPDATE**: Payout should use `availableBalance` instead of `royaltyBalance`
- ⚠️ **NEEDS UPDATE**: Payout logic should reference purchase earnings (not generation royalties)

---

## 📋 Implementation Status

### ✅ Phase 1: Critical Backend (COMPLETED)
1. ✅ Create `ModelPurchase` model
2. ✅ Update `ModelProfile` schema (price, availableBalance, consentRequired)
3. ✅ Create model purchase checkout API
4. ✅ Update Stripe webhook for model purchases
5. ✅ Update watermark logic for human models
6. ✅ Update download API with purchase checks
7. ✅ Add purchase status API endpoint

### ⏳ Phase 2: Frontend UI (IN PROGRESS)
8. ❌ Update frontend download buttons
9. ❌ Create purchase button component
10. ❌ Update model profile view with purchase UI
11. ❌ Handle consent + purchase flow

### ⏳ Phase 3: Payout System Updates (PENDING)
12. ❌ Update payout system to use `availableBalance`
13. ❌ Add earnings dashboard for models

---

## 🧪 Testing Checklist (Once Complete)

### Subscription & Credits
- [ ] Free tier signup → Gets 3 credits
- [ ] Subscribe to Starter → Gets 40 credits immediately
- [ ] Monthly renewal → Credits reset to 40 on `invoice.paid`
- [ ] Upgrade Starter → Growth → Credits jump to 100
- [ ] Downgrade Growth → Starter → Credits capped at 40
- [ ] Cancel subscription → Downgrade to free, 3 credits
- [ ] Payment failure → Status `past_due`, generation blocked
- [ ] Free tier auto-reset after 30 days

### Model Purchase
- [ ] Purchase model (no consent required) → Can download without watermark
- [ ] Purchase model (consent required) → Must request consent first
- [ ] After consent approval → Can purchase
- [ ] After purchase → Model added to `purchasedModels`
- [ ] After purchase → Model earnings updated (90% to `availableBalance`)
- [ ] Platform commission tracked (10%)
- [ ] Watermark removed for purchased models
- [ ] Download enabled for purchased models

### Watermarking
- [x] AI model + Free tier → Preview watermarked, download watermarked
- [x] AI model + Paid tier → Preview watermarked, download non-watermarked
- [x] Human model + Not purchased → Preview watermarked, download blocked
- [x] Human model + Purchased → Preview watermarked, download non-watermarked
- [x] On-the-fly watermarking API returns correct watermarked images
- [x] Download endpoint applies watermark correctly for free tier AI models
- [x] Download endpoint serves non-watermarked for paid tier AI models
- [x] Download endpoint blocks unpurchased human models
- [x] Download endpoint serves non-watermarked for purchased human models
- [x] History view displays watermarked images correctly (fixed November 23, 2025)
- [x] History view displays watermarked images correctly

---

## 📝 Notes

- **Royalty System**: Removed from generation flow. Models only earn from one-time purchases (90% of purchase price).
- **Platform Commission**: 10% of model purchase price goes to platform.
- **Consent Flow**: Already implemented, needs integration with purchase flow.
- **Payout System**: Exists but needs update to use `availableBalance` instead of `royaltyBalance`.

