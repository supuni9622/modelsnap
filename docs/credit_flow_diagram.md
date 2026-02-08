# ModelSnapper Credit Management Flow

## 🆓 FREE TIER (3 Credits/Month)

### Initial Setup
```
User Signs Up (Clerk Webhook)
    ↓
Create User in MongoDB
    ↓
Create BusinessProfile
    - subscriptionTier: 'free'
    - aiCreditsRemaining: 3
    - aiCreditsTotal: 3
    - lastCreditReset: NOW
    - creditResetDay: TODAY'S DATE
```

### Monthly Reset (Cron Job)
```
Daily Cron Job Runs (Midnight UTC)
    ↓
Check All Free Tier Users
    ↓
For Each User:
    Has 30 days passed since lastCreditReset?
        ↓ YES
        Reset credits to 3
        Update lastCreditReset to NOW
        ↓ NO
        Skip this user
```

### Credit Usage
```
User Generates Image
    ↓
Check: Has 30 days passed? (auto-reset check)
    ↓ YES: Reset to 3 first
    ↓ NO: Continue
    ↓
Check: aiCreditsRemaining >= 1?
    ↓ YES: Deduct 1 credit
    ↓ NO: Return error "Insufficient credits"
```

---

## 💳 PAID TIER (40 or 100 Credits/Month)

### Initial Subscription
```
User Subscribes via Stripe
    ↓
Stripe: checkout.session.completed
    ↓
Webhook Handler
    ↓
Update BusinessProfile
    - subscriptionTier: 'starter' or 'growth'
    - aiCreditsRemaining: 40 or 100
    - stripeCustomerId: cus_xxx
    - stripeSubscriptionId: sub_xxx
    - subscriptionCurrentPeriodEnd: DATE
```

### Monthly Renewal (Automatic)
```
Stripe Charges Card (30 days later)
    ↓
Payment Succeeds
    ↓
Stripe: invoice.paid (billing_reason = subscription_cycle)
    ↓
Webhook Handler
    ↓
Reset Credits
    - aiCreditsRemaining: 40 or 100
    - aiCreditsTotal: 40 or 100
    - subscriptionCurrentPeriodEnd: NEW DATE
```

### Credit Usage
```
User Generates Image
    ↓
Check: aiCreditsRemaining >= 1?
    ↓ YES: Deduct 1 credit
    ↓ NO: Return error "Insufficient credits. Upgrade or wait for renewal."
```

### Payment Failure
```
Stripe Fails to Charge Card
    ↓
Stripe: invoice.payment_failed
    ↓
Webhook Handler
    ↓
Update BusinessProfile
    - subscriptionStatus: 'past_due'
    - DO NOT reset credits
    - DO NOT allow new generations
    ↓
User Updates Payment Method
    ↓
Stripe Retries and Succeeds
    ↓
invoice.paid webhook fires
    ↓
Reset credits normally
```

---

## 🔄 PLAN CHANGES

### Upgrade (Free → Starter)
```
User Subscribes
    ↓
checkout.session.completed
    ↓
Change tier to 'starter'
Grant 40 credits immediately
```

### Upgrade (Starter → Growth)
```
User Changes Plan in Portal
    ↓
customer.subscription.updated
    ↓
Detect upgrade
Grant 100 credits immediately
Prorate payment
```

### Downgrade (Growth → Starter)
```
User Changes Plan in Portal
    ↓
customer.subscription.updated
    ↓
Detect downgrade
Cap credits at 40 (keep remaining if < 40)
Change tier to 'starter'
```

### Cancel Subscription
```
User Cancels
    ↓
customer.subscription.deleted
    ↓
Change tier to 'free'
Reset credits to 3
Remove Stripe references
```

---

## 🎯 KEY DIFFERENCES

| Aspect | Free Tier | Paid Tier |
|--------|-----------|-----------|
| **Credit Source** | MongoDB only | Stripe webhooks |
| **Reset Trigger** | Cron job (daily check) | Stripe invoice.paid |
| **Reset Timing** | Monthly from signup date | Monthly from subscription start |
| **Payment Required** | ❌ No | ✅ Yes |
| **Stripe Integration** | ❌ Not needed | ✅ Required |
| **Auto-reset on Usage** | ✅ Yes (if 30 days passed) | ❌ No (waits for webhook) |
| **Rollover Credits** | ❌ No | ❌ No |

---

## 🛡️ EDGE CASES HANDLED

### Free User Signs Up Mid-Month
```
User signs up on March 15
    ↓
Gets 3 credits immediately
    ↓
creditResetDay = 15
    ↓
Next reset: April 15 (30 days later)
```

### Free User Uses All Credits Early
```
User uses all 3 credits on Day 5
    ↓
creditsRemaining = 0
    ↓
Tries to generate on Day 10
    ↓
Check: Has 30 days passed? NO
    ↓
Error: "Insufficient credits. Wait for monthly reset."
```

### Paid User's Payment Fails
```
Payment fails on renewal date
    ↓
Credits DO NOT reset
    ↓
subscriptionStatus = 'past_due'
    ↓
User CANNOT generate new images
    ↓
User updates payment method
    ↓
Stripe retries automatically
    ↓
Payment succeeds → Credits reset
```

### User Upgrades from Free
```
Free user has 1 credit left
    ↓
Upgrades to Starter
    ↓
Immediately gets 40 credits
    ↓
Old 1 credit is replaced
```
