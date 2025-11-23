# Testing Guide - Payment & Credit System

**Date**: November 23, 2025  
**Last Updated**: November 23, 2025  
**Status**: Ready for Testing

**Recent Updates:**
- ✅ Subscription upgrade/downgrade now updates existing subscription (no duplicates)
- ✅ Duplicate customer prevention implemented
- ✅ Success page redirect fixed (locale prefix added)
- ✅ Invoice validation for upgrades (ensures no $0 invoices)

---

## ✅ Prerequisites

Before testing, ensure you have:

### 1. Environment Variables Set Up

**Required Variables:**
```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# Database
MONGO_URI=mongodb://localhost:27017/modelsnap
# OR MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/modelsnap

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# FASHN AI API
FASHN_API_KEY=your_fashn_api_key

# AWS S3 (for image storage)
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# Email (Optional for testing)
RESEND_API_KEY=re_...
```

### 2. Stripe Test Mode Setup

1. **Get Test Keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Copy `Publishable key` and `Secret key`

2. **Set Up Webhook for Local Testing:**
   ```bash
   # Install Stripe CLI
   # macOS: brew install stripe/stripe-cli/stripe
   # Windows: Download from https://stripe.com/docs/stripe-cli
   
   # Login to Stripe
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```
   - Copy the webhook signing secret from the output
   - Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

3. **Create Test Products in Stripe:**
   - Go to [Products](https://dashboard.stripe.com/test/products)
   - Create products matching your pricing plans:
     - **Starter Plan**: $X/month (recurring)
     - **Growth Plan**: $Y/month (recurring)
   - Note the Price IDs (you'll need to add them to `lib/config/pricing.ts`)

### 3. Start the Application

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing Scenarios

### Test 1: Free Tier Signup & Credit Allocation

**Steps:**
1. Sign up as a new user with role "BUSINESS"
2. Check that user gets 3 credits automatically
3. Verify in database: `BusinessProfile.aiCreditsRemaining = 3`

**Expected Result:**
- ✅ User has 3 credits
- ✅ `subscriptionTier = "free"`
- ✅ `subscriptionStatus = "active"`

---

### Test 2: AI Model Generation (Free Tier)

**Steps:**
1. As a free tier user, generate an AI avatar
2. Check credits: Should decrease from 3 to 2
3. View generated image: Should show watermarked preview
4. Download image: Should download watermarked version

**Expected Result:**
- ✅ Credits deducted: `aiCreditsRemaining = 2`
- ✅ Preview shows watermarked image (via `/api/images/[id]/watermarked?type=ai`)
- ✅ History view displays watermarked image correctly
- ✅ Download serves watermarked image

**API Check:**
```bash
# Check preview URL returns watermarked image
curl http://localhost:3000/api/images/{generationId}/watermarked?type=ai

# Check download (should be watermarked for free tier)
curl http://localhost:3000/api/render/download?id={generationId}&type=ai
```

---

### Test 3: Subscription Purchase (Starter Plan)

**Steps:**
1. As a free tier user, go to `/dashboard/business/billing`
2. Scroll to "Upgrade your current plan" section (or click "Upgrade my plan" button)
3. Click "Subscribe" button on Starter plan card
4. Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
5. After checkout redirect, verify credits updated

**Expected Result:**
- ✅ Redirects to Stripe checkout page
- ✅ After successful payment, redirects to success page (`/en/dashboard/business/billing/success-payment`)
- ✅ `subscriptionTier = "starter"`
- ✅ `aiCreditsRemaining = 40`
- ✅ `aiCreditsTotal = 40`
- ✅ `stripeSubscriptionId` is set
- ✅ `subscriptionStatus = "active"`
- ✅ **No duplicate Stripe customers**: Reuses existing customer if found by email

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

**Note:** Price IDs are configured in `lib/config/pricing.ts`:
- Starter: `price_1SWWGuAxKGgV505GHghhGupi`
- Growth: `price_1SWWIsAxKGgV505G2kL5ha8d`

---

### Test 4: AI Model Generation (Paid Tier)

**Steps:**
1. As a paid tier user (Starter or Growth), generate an AI avatar
2. Check credits: Should decrease appropriately
3. View generated image: Should show watermarked preview
4. Download image: Should download **non-watermarked** version

**Expected Result:**
- ✅ Credits deducted correctly
- ✅ Preview shows watermarked image
- ✅ Download serves **non-watermarked** image (direct from S3)

---

### Test 5: Human Model Generation (Preview)

**Steps:**
1. As any user, select a human model
2. Generate an image with the human model
3. Check credits: Should decrease by 1 (human models also use credits)
4. View generated image: Should show watermarked preview
5. Check history view: Should display the human model generation
6. Try to download: Should be blocked (if not purchased)

**Expected Result:**
- ✅ Generation succeeds (no purchase required for preview)
- ✅ Credits deducted: `aiCreditsRemaining` decreases by 1
- ✅ Preview shows watermarked image (via `/api/images/[id]/watermarked?type=human`)
- ✅ History view displays the human model generation correctly
- ✅ History view shows both AI avatar and human model generations combined
- ✅ Download button disabled or shows "Purchase Required" message

---

### Test 6: Human Model Purchase (No Consent Required)

**Prerequisites:**
- Create a model profile with `consentRequired = false`
- Set a price (e.g., $10.00)

**Steps:**
1. Go to model profile page
2. Click "Purchase Model Access"
3. Complete Stripe checkout
4. After purchase, try to download the generated image

**Expected Result:**
- ✅ Purchase button redirects to Stripe checkout
- ✅ After checkout, `businessProfile.purchasedModels` includes model ID
- ✅ `modelProfile.availableBalance` increased by 90% of purchase price
- ✅ Download now works and serves non-watermarked image

**Database Check:**
```javascript
// In MongoDB
db.businessprofiles.findOne({ userId: ObjectId("...") })
// Should have modelId in purchasedModels array

db.modelprofiles.findOne({ _id: ObjectId("...") })
// availableBalance should be updated
```

---

### Test 7: Human Model Purchase (Consent Required)

**Prerequisites:**
- Create a model profile with `consentRequired = true`
- Set a price

**Steps:**
1. Go to model profile page
2. Click "Request Consent" (if not already approved)
3. Wait for consent approval (or approve manually in database)
4. After consent approved, click "Purchase Model Access"
5. Complete Stripe checkout

**Expected Result:**
- ✅ Purchase button disabled until consent approved
- ✅ After consent, purchase button enabled
- ✅ Purchase flow works as in Test 6

---

### Test 8: Monthly Credit Reset (Subscription)

**Steps:**
1. As a paid tier user, use all credits
2. Wait for next billing cycle OR manually trigger webhook
3. Simulate `invoice.paid` webhook with `billing_reason = "subscription_cycle"`

**Manual Webhook Test:**
```bash
# Using Stripe CLI
stripe trigger invoice.paid

# Or manually via API
curl -X POST http://localhost:3000/api/webhook/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: ..." \
  -d @test-webhook-invoice-paid.json
```

**Expected Result:**
- ✅ Credits reset to plan limit (40 for Starter, 100 for Growth)
- ✅ `subscriptionCurrentPeriodEnd` updated

---

### Test 9: Free Tier Credit Reset (Cron Job)

**Steps:**
1. As a free tier user, use all 3 credits
2. Wait 30 days OR manually update `lastCreditReset` in database
3. Manually trigger cron endpoint:

```bash
curl -X POST http://localhost:3000/api/cron/reset-free-credits
```

**Expected Result:**
- ✅ Credits reset to 3
- ✅ `lastCreditReset` updated to current date

---

### Test 10: Subscription Upgrade/Downgrade ✅ TESTED & WORKING

**Steps:**
1. As Starter plan user, click "Upgrade" on Growth plan
2. System detects existing subscription and updates it (no new subscription created)
3. Verify in Stripe Dashboard: Only ONE subscription exists (not multiple)
4. Verify credits immediately updated to 100
5. Downgrade back to Starter
6. Verify subscription updated (not new one created)
7. Verify credits capped at 40 (if had more than 40, keep remaining up to 40)
8. Check invoices: Should have proper amounts (not $0 for upgrades)

**Expected Result:**
- ✅ **No duplicate subscriptions**: Updates existing subscription instead of creating new one
- ✅ **No duplicate customers**: Reuses existing Stripe customer
- ✅ Upgrade: Credits jump to new tier limit immediately
- ✅ Downgrade: Credits capped at new tier limit
- ✅ **Invoices created correctly**: Upgrades have positive amounts, downgrades may have credits
- ✅ **Success page redirects correctly**: After payment, redirects to `/en/dashboard/business/billing/success-payment`

**Implementation Details:**
- System checks `BusinessProfile.stripeSubscriptionId` first
- Falls back to listing Stripe subscriptions if not in database
- Updates subscription directly via `stripe.subscriptions.update()`
- Creates prorated invoices automatically
- Validates invoice amounts (upgrades should never be $0)

**Stripe Dashboard Verification:**
- Check customer page: Should show only ONE active subscription
- Check subscription details: Price should update when plan changes
- Check invoices: Should show prorated amounts for plan changes

---

### Test 11: Subscription Cancellation

**Steps:**
1. As a paid tier user, cancel subscription in Stripe dashboard
2. Webhook `customer.subscription.deleted` should fire
3. Verify user downgraded to free tier

**Expected Result:**
- ✅ `subscriptionTier = "free"`
- ✅ `aiCreditsRemaining = 3`
- ✅ `aiCreditsTotal = 3`
- ✅ `stripeSubscriptionId` cleared

---

### Test 12: Payment Failure

**Steps:**
1. As a paid tier user, simulate payment failure
2. Trigger `invoice.payment_failed` webhook

**Expected Result:**
- ✅ `subscriptionStatus = "past_due"`
- ✅ Generation blocked (check `canGenerate()` function)
- ✅ Credits not reset

---

### Test 13: Watermarking System

**Test Scenarios:**

#### A. AI Model + Free Tier
- Preview: ✅ Watermarked
- Download: ✅ Watermarked

#### B. AI Model + Paid Tier
- Preview: ✅ Watermarked
- Download: ❌ Non-watermarked

#### C. Human Model + Not Purchased
- ✅ Generation works (uses credits)
- ✅ Preview shows watermarked image
- ✅ History view displays the generation
- ✅ Download is blocked (purchase required)

#### D. Human Model + Purchased
- ✅ Generation works (uses credits)
- ✅ Preview shows watermarked image
- ✅ History view displays the generation
- ✅ Download works (non-watermarked)

**API Tests:**
```bash
# Test watermarking endpoint
curl http://localhost:3000/api/images/{id}/watermarked?type=ai
curl http://localhost:3000/api/images/{id}/watermarked?type=human

# Test download endpoint
curl http://localhost:3000/api/render/download?id={id}&type=ai
curl http://localhost:3000/api/render/download?id={id}&type=human
```

---

## 🔍 Debugging Tips

### Check Database State

```javascript
// MongoDB Shell
use modelsnap

// Check BusinessProfile
db.businessprofiles.findOne({ userId: ObjectId("...") })

// Check ModelProfile
db.modelprofiles.findOne({ _id: ObjectId("...") })

// Check ModelPurchase
db.modelpurchases.find({ businessId: ObjectId("...") })
```

### Check Stripe Webhook Logs

```bash
# View webhook events
stripe events list

# View specific event
stripe events retrieve evt_...
```

### Check API Responses

```bash
# Check generations endpoint
curl http://localhost:3000/api/generations

# Check purchase status
curl http://localhost:3000/api/models/{modelId}/purchase-status

# Check business profile
curl http://localhost:3000/api/business/profile
```

### Common Issues

1. **Webhooks not firing:**
   - Ensure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
   - Check webhook secret matches in `.env.local`

2. **Credits not resetting:**
   - Check `subscriptionCurrentPeriodEnd` date
   - Verify webhook handler is receiving events
   - Check database for `invoice.paid` events

3. **Download blocked:**
   - Verify `purchasedModels` array includes model ID
   - Check subscription tier for AI models
   - Verify download endpoint logic

4. **Watermark not showing:**
   - Check `previewImageUrl` is used in frontend
   - Verify watermarking API endpoint is accessible
   - Check S3 image URLs are correct

5. **Duplicate subscriptions created:**
   - ✅ FIXED (November 23, 2025): System now checks for existing subscriptions before creating new ones
   - ✅ FIXED: Updates existing subscription instead of creating duplicate
   - Verify `BusinessProfile.stripeSubscriptionId` is set correctly
   - Check Stripe Dashboard: Should only see ONE active subscription per customer
   - If you see multiple subscriptions, check server logs for subscription detection

6. **Duplicate customers in Stripe:**
   - ✅ FIXED (November 23, 2025): System now checks for existing customers by email before creating new ones
   - ✅ FIXED: Reuses existing Stripe customer if found
   - Check Stripe Dashboard: Should only see ONE customer per email address

7. **Success page not redirecting after payment:**
   - ✅ FIXED (November 23, 2025): Success URLs now include locale prefix (`/en/`)
   - Verify URL format: `${publicUrl}/en/dashboard/business/billing/success-payment`
   - Check browser console for redirect errors
   - Verify Stripe checkout session has correct `success_url` in logs

---

## 📊 Test Results Template

```
Test 1: Free Tier Signup          [ ] Pass [ ] Fail
Test 2: AI Generation (Free)      [ ] Pass [ ] Fail
Test 3: Subscription Purchase     [ ] Pass [ ] Fail
Test 4: AI Generation (Paid)      [ ] Pass [ ] Fail
Test 5: Human Model Preview       [x] Pass [ ] Fail
- ✅ Human model generation works
- ✅ Credits are deducted correctly
- ✅ History view displays human model generations
- ✅ History view combines AI and human model results (fixed November 23, 2025)
Test 6: Model Purchase (No Consent) [ ] Pass [ ] Fail
Test 7: Model Purchase (Consent)  [ ] Pass [ ] Fail
Test 8: Monthly Credit Reset     [ ] Pass [ ] Fail
Test 9: Free Tier Reset           [ ] Pass [ ] Fail
Test 10: Upgrade/Downgrade        [x] Pass [ ] Fail
- ✅ No duplicate subscriptions created
- ✅ Existing subscription updated correctly
- ✅ Credits updated immediately
- ✅ Invoices created with proper amounts
- ✅ Success page redirects correctly (fixed November 23, 2025)
Test 11: Cancellation             [ ] Pass [ ] Fail
Test 12: Payment Failure          [ ] Pass [ ] Fail
Test 13: Watermarking System      [ ] Pass [ ] Fail
```

---

## 🚀 Quick Test Checklist

**Before Testing:**
- [ ] Environment variables set up
- [ ] Stripe test mode configured
- [ ] Stripe CLI running for webhooks
- [ ] MongoDB connected
- [ ] Application running (`npm run dev`)

**Core Functionality:**
- [ ] User signup creates BusinessProfile with 3 credits
- [ ] AI generation deducts credits
- [ ] Subscription purchase updates credits
- [ ] Human model purchase works
- [ ] Download permissions enforced
- [ ] Watermarking works correctly

**Edge Cases:**
- [ ] Credit reset on subscription renewal
- [ ] Free tier credit reset after 30 days
- [ ] Subscription cancellation downgrades to free
- [ ] Payment failure blocks generation
- [x] Upgrade/downgrade handles credits correctly ✅ (Fixed November 23, 2025)
- [x] No duplicate subscriptions on upgrade/downgrade ✅ (Fixed November 23, 2025)
- [x] No duplicate customers created ✅ (Fixed November 23, 2025)
- [x] Success page redirects correctly after payment ✅ (Fixed November 23, 2025)

---

## 📝 Notes

- Use Stripe test mode for all payment testing
- Test cards don't charge real money
- Webhooks require Stripe CLI or ngrok for local testing
- Database changes persist between tests (reset if needed)
- Check browser console and server logs for errors

---

**Happy Testing! 🎉**

