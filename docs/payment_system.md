Payment and credit system requirements. 

Stripe will be used for this in Next.js 

So this the pricing model. 

Businesses have to buy a subscription package to generate images no matter it uses AI model or Human model. 
AI models are watermarked only for free subscription package. 
AI models are not watermarked for paid packages. 
For human models generated images should be watermarked no matter the subscription package. Businesses can check the human models by generating images. But Download button is disable unless Business has already paid for that Human model. If Business need to Download a Human model generated image, There are 2 checks
1. Human models have 2 categories. - Consent required and Consent not required. 
For consent required . If consent not required Business have to pay the Human model's price, this price is different from model to model and model can define it. This is one time price (Later we will define a time frame) After a business buy this, then that model should be used by that Business without watermarks or any other payment for that model. 
1. If consent is required, Businesses have to send consent request before purchase and download. If the consent approved by model for that business, business can pay the model's price and then download the image without watermark and use the model in future generations. 

As the platform, we have to
1. Monthly subscription-based charge for Businesses
2. One time different value charges for models  - 10% commission to the platform
3. Payout for the models. 

Subscription packages


```typescript
export const PricingPlans: PricingPlanTypes[] = [
  {
    id: "free",
    description: "Perfect for trying out ModelSnapper.ai",
    name: "Free",
    type: "payment",
    price: "0",
    currency: "usd",
    currencySymbol: "$",
    billingCycle: "subscription",
    priceId: "",
    variantId: "",
    features: [
      {
        active: true,
        title: "3 AI-generated on-model photos per month",
      },
      {
        active: true,
        title: "Watermarked",
      },
      {
        active: true,
        title: "Access to AI model gallery",
      },
      {
        active: true,
        title: "Basic support",
      },
    ],
    popular: false,
    isFreeCredits: 3,
    displayButtonName: "Join Waitlist",
  },
  {
    id: "starter",
    description: "For small boutiques, Instagram sellers & designers",
    name: "Starter",
    type: "subscription",
    price: "19",
    currency: "usd",
    currencySymbol: "$",
    billingCycle: "monthly",
    priceId: "", // Replace with actual Stripe price ID
    variantId: "", // Replace with actual Lemon Squeezy variant ID
    features: [
      {
        active: true,
        title: "40 AI-generated on-model photos/month",
      },
      {
        active: true,
        title: "No watermarks",
      },
      {
        active: true,
        title: "Access to AI model gallery",
      },
      {
        active: true,
        title: "Access to Human Model Marketplace",
      },
      {
        active: true,
        title: "High-resolution downloads",
      },
      {
        active: true,
        title: "Email support",
      },
    ],
    popular: true,
    isFreeCredits: 40,
    displayButtonName: "Join Waitlist",
  },
  {
    id: "growth",
    description: "For manufacturers & fast-moving fashion brands",
    name: "Growth",
    type: "subscription",
    price: "49",
    currency: "usd",
    currencySymbol: "$",
    billingCycle: "monthly",
    priceId: "", // Replace with actual Stripe price ID
    variantId: "", // Replace with actual Lemon Squeezy variant ID
    features: [
      {
        active: true,
        title: "100 AI-generated on-model photos/month",
      },
      {
        active: true,
        title: "No watermarks",
      },
      {
        active: true,
        title: "Access to AI model gallery",
      },
      {
        active: true,
        title: "Access to Human Model Marketplace",
      },
      {
        active: true,
        title: "High-resolution downloads",
      },
      {
        active: true,
        title: "Priority support",
      }
    ],
    popular: false,
    isFreeCredits: 100,
    displayButtonName: "Join Waitlist",
  },
];
```

business is based in sri lanka but a globle saas product. 

# 1. In Stripe Dashboard → Developers → Webhooks → Add Endpoint

# 2. Endpoint URL (local testing):
https://your-domain.com/api/webhooks/stripe

# For local development, use Stripe CLI:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 3. Select events to listen:
✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.paid
✅ invoice.payment_failed
✅ payment_intent.succeeded
✅ payment_intent.payment_failed

# 4. Copy the Webhook Signing Secret (whsec_xxxxx)
# Add to .env.local as STRIPE_WEBHOOK_SECRET

Test Subscription Flow
# 1. Use Stripe test cards:
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits

# 2. Test scenarios:
✅ Successful payment → Credits granted
✅ Failed payment → Subscription stays past_due
✅ Cancel subscription → Downgrade to free
✅ Renewal → Credits reset monthly

# 3. Verify in MongoDB:
- businessProfile.subscriptionTier updated
- businessProfile.aiCreditsRemaining updated
- businessProfile.stripeCustomerId saved

Test Model Purchase Flow
# 1. Navigate to human model marketplace
# 2. Select a model (no consent required for testing)
# 3. Click "Purchase Access"
# 4. Complete payment with test card
# 5. Verify:
   ✅ Purchase record created in ModelPurchase collection
   ✅ Model added to businessProfile.purchasedModels
   ✅ Model earnings updated in modelProfile.availableBalance
   ✅ Can now generate without watermarks (when you implement that)

we have credit limits for each subscription package. For free 3 credits, starter 40, and growth 100. This is  monthly renew one. handle this with stripe. 
🎯 Approach 1: Webhook-Based Credit Reset (RECOMMENDED)
This approach uses Stripe's invoice.paid webhook event to automatically reset credits when the subscription renews each month.
How It Works:

User subscribes → Initial credits granted
Every month, Stripe creates an invoice
When invoice is paid → Webhook fires
Your server resets credits to the plan limit

Advantages:
✅ Accurate - Credits reset exactly when payment succeeds
✅ No cron jobs needed - Stripe handles timing
✅ Handles failed payments - Credits don't reset if payment fails
✅ Works with proration - Handles upgrades/downgrades correctly

# 1. Create Products in Stripe Dashboard
✅ Starter Plan - $19/month - Get price ID
✅ Growth Plan - $49/month - Get price ID

# 2. Add to .env.local
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_GROWTH_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 1. Create webhook in Stripe Dashboard
URL: https://your-domain.com/api/webhooks/stripe

# 2. Select these events:
✅ checkout.session.completed
✅ invoice.paid (CRITICAL for credit reset)
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_failed
✅ payment_intent.succeeded

# 3. Test locally with Stripe CLI:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
stripe trigger invoice.paid

✅ Phase 3: Database Schema Updates
// Update BusinessProfile schema to include:
- subscriptionTier: 'free' | 'starter' | 'growth'
- aiCreditsRemaining: number
- aiCreditsTotal: number
- stripeSubscriptionId: string
- subscriptionCurrentPeriodEnd: Date

// Indexes needed:
- { stripeCustomerId: 1 }
- { stripeSubscriptionId: 1 }
- { subscriptionCurrentPeriodEnd: 1 }

✅ Phase 4: Testing Scenarios

# Use Stripe test card: 4242 4242 4242 4242

TEST 1: New Subscription
✅ Subscribe to Starter plan
✅ Verify credits: 40
✅ Verify webhook logs in Stripe
✅ Check MongoDB: subscriptionTier = 'starter'

TEST 2: Monthly Renewal (Simulate)
✅ Use Stripe CLI: stripe trigger invoice.paid
✅ Verify credits reset to 40
✅ Check webhook handler logs

TEST 3: Credit Usage
✅ Generate 5 AI images
✅ Verify creditsRemaining = 35
✅ Check /api/billing/subscription shows correct count

TEST 4: Upgrade (Starter → Growth)
✅ Change plan in Stripe Customer Portal
✅ Verify credits immediately jump to 100
✅ Verify proration in Stripe invoice

TEST 5: Downgrade (Growth → Starter)
✅ Change plan back to Starter
✅ Verify credits capped at 40 (if had remaining)
✅ Next renewal will give fresh 40

TEST 6: Cancellation
✅ Cancel subscription
✅ Verify: tier = 'free', credits = 3
✅ Can still generate (3 free credits)

TEST 7: Payment Failure
✅ Use test card: 4000 0000 0000 0341
✅ Verify subscription status = 'past_due'
✅ Credits don't reset until payment succeeds

🎯 Key Points Summary
How Monthly Credit Reset Works:

Initial Subscription (checkout.session.completed)

User subscribes → Get 40 or 100 credits immediately


Monthly Renewal (invoice.paid)

Every 30 days, Stripe charges the card
When payment succeeds → Webhook fires
Your server resets credits to full amount (40 or 100)


Failed Payment (invoice.payment_failed)

Credits DON'T reset if payment fails
User keeps remaining credits but marked as past_due
When payment succeeds later → Credits reset


Plan Changes (customer.subscription.updated)

Upgrade: Immediate full credits for new tier
Downgrade: Credits capped at new tier limit
Cancellation: Downgrade to free (3 credits)



Why This Approach is Best:
✅ Accurate - Credits reset exactly when payment succeeds
✅ No manual cron jobs - Stripe handles all timing
✅ Handles edge cases - Failed payments, refunds, plan changes
✅ Scalable - Works for 10 users or 10,000 users
✅ Reliable - Stripe's infrastructure (99.99% uptime)

Handling Free Package Credits (No Stripe Required)

🎯 Free Tier Credit Management Strategy
Key Principles:

Free users are NOT in Stripe - No customer, no subscription
Credits reset via cron job or database trigger - Not webhooks
Simple MongoDB-based tracking - No payment gateway involved

Generation vs Download Permissions
Generation Permission 
// app/api/render/route.ts
Can Generate (Create Preview) IF:
1. Has AI credits (for AI models)
2. Subscription status is 'active' 

Does NOT require:
❌ Model purchase (human models can be previewed)
❌ Download permission
❌ Consent approval (consent only required for purchase)

Result:
- Generates watermarked image
- Stores in database
- Returns preview URL

Download Permission:
typescript// app/api/render/download/route.ts
Can Download IF:
1. AI Model:
   → Subscription tier is NOT free
   
2. Human Model:
   → Model is in businessProfile.purchasedModels[]
   
Blocks download with error:
- AI Model + Free tier: "Upgrade to remove watermarks and download"
- Human Model + Not purchased: "Purchase model access to download ($X)"

AI model download permission

- Both free and paid users can generate watermarked images as they have credits
- Free users can download watermarked images while paid users can download no-watermarked images

Technical consideration
If we always watermark during generation and store watermarked images, we need a way to remove watermarks during download. Options:
Store both versions (watermarked and non-watermarked) — more storage
Store non-watermarked and apply watermark on-the-fly for free users — more processing
Use image processing to remove watermarks — complex and unreliable
Which approach should we use? Or should we store the original non-watermarked version and apply watermarks on-the-fly during download for users who need them?

