# Lemon Squeezy Migration Configuration Guide

This guide provides step-by-step instructions for configuring the Lemon Squeezy payment integration after migration from Stripe.

**Last Updated:** 2025-01-XX

---

## 📋 Overview

The migration from Stripe to Lemon Squeezy is complete. This guide covers all configuration steps needed to make the payment system operational.

---

## 🔧 Step 1: Environment Variables

Add these variables to your `.env` file:

```env
# Lemon Squeezy API Configuration
LEMON_SQUEEZY_API_KEY=your_api_key_here
LEMON_SQUEEZY_STORE_ID=your_store_id_here
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here

# Model Purchase Variant ID (for one-time model purchases)
LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID=your_variant_id_here
```

### How to Get These Values

#### API Key & Store ID
1. Go to [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com/)
2. Navigate to **Settings > API**
3. Copy your **API Key** → `LEMON_SQUEEZY_API_KEY`
4. Copy your **Store ID** → `LEMON_SQUEEZY_STORE_ID`

#### Webhook Secret
1. Go to **Settings > Webhooks** (see Step 3 below)
2. After creating the webhook, copy the **Webhook Secret**
3. Add to `.env` as `LEMON_SQUEEZY_WEBHOOK_SECRET`

#### Model Purchase Variant ID
1. Create a product for model purchases (see Step 2.C below)
2. Copy the **Variant ID** → `LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID`

---

## 🛍️ Step 2: Create Products in Lemon Squeezy

### A. Subscription Plans

Create subscription products for your pricing plans:

#### Starter Plan ($19/month)
1. Go to **Products** in Lemon Squeezy dashboard
2. Click **New Product**
3. Set product name: "ModelSnap Starter Plan"
4. Set product type: **Subscription**
5. Set price: **$19.00**
6. Set billing cycle: **Monthly**
7. Click **Create Product**
8. **Copy the Variant ID** (numeric ID, e.g., `123456`)

#### Growth Plan ($49/month)
1. Create another product: "ModelSnap Growth Plan"
2. Set price: **$49.00**
3. Set billing cycle: **Monthly**
4. **Copy the Variant ID**

### B. Credit Packages (Optional)

If you want to offer credit top-ups:

#### 50 Credits Package ($4.99)
1. Create product: "50 Credits"
2. Set product type: **One-time payment**
3. Set price: **$4.99**
4. **Copy the Variant ID**

#### 100 Credits Package ($8.99)
1. Create product: "100 Credits"
2. Set product type: **One-time payment**
3. Set price: **$8.99**
4. **Copy the Variant ID**

### C. Model Purchase Product

This is a special product for one-time model purchases:

1. Create product: "Model Purchase" (or similar name)
2. Set product type: **One-time payment**
3. Set a base price (e.g., **$10.00** - this will be overridden by `customPrice` in code)
4. **Copy the Variant ID** → This goes in `LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID`

**Note:** The actual model purchase price is set dynamically via `customPrice` in the checkout API, so the base price here is just a placeholder.

---

## 🔗 Step 3: Configure Webhook

### Webhook URL

The webhook endpoint is located at:

**Production:**
```
https://yourdomain.com/api/webhook/lemonsqueezy
```

**Development (for local testing with ngrok):**
```
https://your-ngrok-url.ngrok.io/api/webhook/lemonsqueezy
```

### Setup Steps

1. Go to **Settings > Webhooks** in Lemon Squeezy dashboard
2. Click **Create Webhook**
3. Enter the webhook URL (use production URL for live, ngrok URL for testing)
4. Select these events:
   - ✅ `order_created` - For one-time payments, credit purchases, and model purchases
   - ✅ `subscription_created` - For new subscriptions
   - ✅ `subscription_updated` - For plan upgrades/downgrades
   - ✅ `subscription_cancelled` - For subscription cancellations
   - ✅ `subscription_payment_success` - For monthly subscription renewals
5. Click **Create Webhook**
6. **Copy the Webhook Secret** that's generated
7. Add it to your `.env` file as `LEMON_SQUEEZY_WEBHOOK_SECRET`

### Important: Webhook Configuration

✅ **Already Configured:**
- Raw request body handling (using `req.text()` in App Router)
- X-Signature header verification
- HMAC SHA256 signature verification
- Secure signature comparison using `crypto.timingSafeEqual`

The webhook route is properly configured to receive raw request bodies and verify the `X-Signature` header using the webhook secret.

### Local Testing with ngrok

For local development, use ngrok to expose your local server:

```bash
# Install ngrok (if not already installed)
# Then run:
ngrok http 3000
```

Use the ngrok HTTPS URL in your webhook configuration.

---

## ⚙️ Step 4: Update Pricing Configuration

Edit `lib/config/pricing.ts` and update the `variantId` fields:

```typescript
export const PricingPlans: PricingPlanTypes[] = [
  {
    id: "starter",
    name: "Starter",
    type: "subscription",
    price: "19",
    // ... other fields ...
    variantId: "123456", // ← Replace with your Starter plan variant ID
  },
  {
    id: "growth",
    name: "Growth",
    type: "subscription",
    price: "49",
    // ... other fields ...
    variantId: "789012", // ← Replace with your Growth plan variant ID
  },
];

// If using credit packages:
export const Credits = {
  plans: [
    {
      title: "50 Credits",
      price: "4.99",
      variantId: "345678", // ← Replace with your 50 Credits variant ID
      credits: 50,
    },
    {
      title: "100 Credits",
      price: "8.99",
      variantId: "901234", // ← Replace with your 100 Credits variant ID
      credits: 100,
    },
  ],
};
```

---

## 🏪 Step 5: Update Store ID

Edit `lib/config/settings.ts`:

```typescript
export const lemonSqueezyStoreId = 12345; // ← Replace with your actual store ID (number, not string)
```

You can find your Store ID in:
- Lemon Squeezy Dashboard > Settings > API
- Or in the URL when viewing your store

---

## ✅ Configuration Checklist

Use this checklist to ensure everything is configured:

### Environment Variables
- [ ] `LEMON_SQUEEZY_API_KEY` set in `.env`
- [ ] `LEMON_SQUEEZY_STORE_ID` set in `.env`
- [ ] `LEMON_SQUEEZY_WEBHOOK_SECRET` set in `.env`
- [ ] `LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID` set in `.env`

### Lemon Squeezy Dashboard
- [ ] Starter Plan product created with variant ID noted
- [ ] Growth Plan product created with variant ID noted
- [ ] Model Purchase product created with variant ID noted
- [ ] Credit packages created (if using) with variant IDs noted
- [ ] Webhook created with correct URL
- [ ] All required webhook events selected
- [ ] Webhook secret copied to `.env`

### Code Configuration
- [ ] `variantId` updated in `lib/config/pricing.ts` for Starter plan
- [ ] `variantId` updated in `lib/config/pricing.ts` for Growth plan
- [ ] `variantId` updated in `lib/config/pricing.ts` for credit packages (if using)
- [ ] `lemonSqueezyStoreId` updated in `lib/config/settings.ts`

---

## 🧪 Testing

### Test Subscription Checkout

1. Navigate to your pricing page
2. Click "Subscribe" on Starter or Growth plan
3. Complete checkout in Lemon Squeezy
4. Verify:
   - User plan updated in database
   - Credits added correctly
   - Subscription ID stored in BusinessProfile
   - Webhook received and processed

### Test Model Purchase

1. Navigate to a model profile
2. Click "Purchase Access"
3. Complete checkout
4. Verify:
   - ModelPurchase record created
   - Model added to business's `purchasedModels`
   - Model's `availableBalance` updated (90% of purchase)
   - Platform commission calculated (10%)

### Test Subscription Update

1. User with active subscription clicks "Upgrade" to different plan
2. Verify:
   - Existing subscription updated (not new one created)
   - Plan changed in database
   - Credits updated

### Test Webhook Events

Check your server logs for webhook processing:
- `order_created` events should process model purchases and credit purchases
- `subscription_created` should update user plan and BusinessProfile
- `subscription_payment_success` should reset credits on renewal
- `subscription_cancelled` should downgrade user to free plan

---

## 🐛 Troubleshooting

### "Variant ID is required" Error

**Cause:** Variant ID not set in pricing config or environment variable missing.

**Solution:**
- Check `lib/config/pricing.ts` has `variantId` set for all plans
- Verify `LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID` is set in `.env`

### "Lemon Squeezy API key not configured" Error

**Cause:** Missing or invalid API key.

**Solution:**
- Verify `LEMON_SQUEEZY_API_KEY` is set in `.env`
- Check API key format (should start with `eyJ`)
- Regenerate API key in Lemon Squeezy dashboard if needed

### Webhook Not Receiving Events

**Cause:** Webhook URL incorrect or not accessible.

**Solution:**
- Verify webhook URL is correct in Lemon Squeezy dashboard
- For local testing, ensure ngrok is running and URL is updated
- Check webhook secret matches between dashboard and `.env`
- Verify your server is publicly accessible (for production)

### "Invalid store ID format" Error

**Cause:** Store ID is not a number.

**Solution:**
- Ensure `lemonSqueezyStoreId` in `lib/config/settings.ts` is a number, not a string
- Verify Store ID is correct from Lemon Squeezy dashboard

### Subscription Update Not Working

**Cause:** Existing subscription not found or API error.

**Solution:**
- Check BusinessProfile has `lemonsqueezySubscriptionId` set
- Verify subscription exists in Lemon Squeezy dashboard
- Check server logs for API errors
- Ensure user has `lemonsqueezyCustomerId` set

### Model Purchase Not Processing

**Cause:** Webhook not handling model purchase correctly.

**Solution:**
- Verify `order_created` webhook event is selected
- Check custom data contains `type: "model_purchase"`
- Verify `LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID` matches the variant used
- Check server logs for webhook processing errors

---

## 📝 Important Notes

1. **Single Subscription Enforcement:** Businesses can only have one active subscription at a time. The system automatically updates existing subscriptions instead of creating duplicates.

2. **Model Purchase Pricing:** Model purchase prices are set dynamically via `customPrice` in the checkout API. The base price in Lemon Squeezy product is just a placeholder.

3. **10% Platform Commission:** Model purchases automatically calculate 10% platform commission. 90% goes to the model's `availableBalance`.

4. **Webhook Security:** Webhook signature verification is required. Ensure `LEMON_SQUEEZY_WEBHOOK_SECRET` matches between dashboard and `.env`.

5. **Testing:** Always test in Lemon Squeezy test mode first before going live.

---

## 🔄 Migration Status

✅ **Completed:**
- Database schemas updated
- Checkout routes migrated
- Webhook handler implemented
- Payment provider set to Lemon Squeezy
- Single subscription enforcement
- Model purchase flow with commission

⏳ **Pending Configuration:**
- Environment variables setup
- Lemon Squeezy products creation
- Variant IDs configuration
- Webhook setup

---

## 🧪 Test Mode vs Production Mode

The implementation supports both test mode and production mode. The code is the same for both; you switch between them by changing environment variables and Lemon Squeezy dashboard settings.

### Test Mode Setup

**When to use:** During development and initial testing

1. **Create Test Products:**
   - Products created in Lemon Squeezy are in test mode by default
   - Create all your products (subscriptions, credits, model purchase)
   - Note the test variant IDs

2. **Create Test Webhook:**
   - Go to **Settings > Webhooks**
   - Create webhook with your test URL (ngrok for local, or test domain)
   - Copy the **Test Mode Webhook Secret**

3. **Environment Variables (Test):**
   ```env
   LEMON_SQUEEZY_API_KEY=your_api_key  # Same key works for test and production
   LEMON_SQUEEZY_STORE_ID=your_store_id  # Same ID
   LEMON_SQUEEZY_WEBHOOK_SECRET=test_webhook_secret  # Test mode secret
   LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID=test_variant_id  # Test variant ID
   ```

4. **Update Pricing Config:**
   - Use test variant IDs in `lib/config/pricing.ts`
   - Test all payment flows

### Production Mode Setup

**When to use:** After testing is complete and ready for live transactions

#### Step 1: Activate Your Store

1. Go to [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com/)
2. Navigate to your store settings
3. **Activate your store** for live transactions (if not already active)
   - This enables processing of real payments

#### Step 2: Copy Products to Live Mode

**Important:** Test products are NOT automatically available in production. You must copy them.

1. Go to **Products** in Lemon Squeezy dashboard
2. For each product (Starter, Growth, Credits, Model Purchase):
   - Click on the product
   - Use the **"Copy to Live Mode"** feature
   - **Note the new Live Mode Variant IDs** (they will be different from test IDs)

#### Step 3: Create Production Webhook

1. Go to **Settings > Webhooks**
2. Click **Create Webhook** (create a new one for production)
3. Set webhook URL to your production domain:
   ```
   https://yourdomain.com/api/webhook/lemonsqueezy
   ```
4. Select the same events as test mode:
   - `order_created`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_payment_success`
5. **Copy the Production Webhook Secret** (different from test secret)

#### Step 4: Update Production Environment Variables

In your production environment (Vercel, etc.), set:

```env
# Production Environment Variables
LEMON_SQUEEZY_API_KEY=your_api_key  # Same key (store must be activated)
LEMON_SQUEEZY_STORE_ID=your_store_id  # Same ID
LEMON_SQUEEZY_WEBHOOK_SECRET=production_webhook_secret  # Production secret
LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID=live_variant_id  # Live variant ID
```

#### Step 5: Update Pricing Configuration for Production

Update `lib/config/pricing.ts` with live mode variant IDs:

```typescript
export const PricingPlans: PricingPlanTypes[] = [
  {
    id: "starter",
    // ...
    variantId: "live_starter_variant_id", // ← Live mode variant ID
  },
  {
    id: "growth",
    // ...
    variantId: "live_growth_variant_id", // ← Live mode variant ID
  },
];

export const Credits = {
  plans: [
    {
      title: "50 Credits",
      variantId: "live_50_credits_variant_id", // ← Live mode variant ID
    },
    // ...
  ],
};
```

### Key Differences: Test vs Production

| Aspect | Test Mode | Production Mode |
|--------|-----------|-----------------|
| **API Key** | Same key | Same key (store must be activated) |
| **Store ID** | Same ID | Same ID |
| **Webhook Secret** | Test mode secret | Production mode secret (different) |
| **Variant IDs** | Test variant IDs | Live variant IDs (different) |
| **Products** | Test products | Must copy to live mode |
| **Payments** | Test transactions | Real payments |
| **Webhook URL** | Test URL (ngrok/local) | Production URL |

### Testing Checklist Before Going Live

- [ ] All test mode flows work correctly
- [ ] Webhook receives and processes all events
- [ ] Subscription creation works
- [ ] Subscription updates work
- [ ] Model purchases work with 10% commission
- [ ] Credit purchases work (if applicable)
- [ ] Store activated in Lemon Squeezy
- [ ] All products copied to live mode
- [ ] Live variant IDs noted and updated in code
- [ ] Production webhook created
- [ ] Production environment variables set
- [ ] Production webhook secret configured
- [ ] Test transaction in production mode successful

### Switching Between Test and Production

**For Development:**
- Use test mode webhook secret
- Use test variant IDs
- Test with test products

**For Production:**
- Use production webhook secret
- Use live variant IDs
- Use live products

**Note:** You can run both test and production webhooks simultaneously by creating separate webhooks in Lemon Squeezy dashboard with different URLs and secrets.

---

## 📚 Additional Resources

- [Lemon Squeezy API Documentation](https://docs.lemonsqueezy.com/api)
- [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com/)
- [Webhook Events Reference](https://docs.lemonsqueezy.com/help/webhooks)
- [Testing & Going Live Guide](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live)
- [ngrok for Local Testing](https://ngrok.com/)

---

**Need Help?** Check the troubleshooting section above or review the server logs for detailed error messages.

