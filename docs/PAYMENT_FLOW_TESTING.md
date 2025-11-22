# Payment Flow Testing Guide

This document provides a comprehensive guide for testing the Stripe payment integration flow.

**Last Updated:** 2025-11-22

---

## 🔧 Prerequisites

Before testing the payment flow, ensure:

1. **Stripe Configuration:**
   - ✅ `STRIPE_SECRET_KEY` is set (use test key for testing)
   - ✅ `STRIPE_WEBHOOK_SECRET` is set (for webhook verification)
   - ✅ Stripe webhook endpoint configured in Stripe Dashboard
   - ✅ Webhook URL: `https://your-domain.com/api/webhook/stripe`

2. **Stripe Test Mode:**
   - Use Stripe test mode for safe testing
   - Test card numbers available at: https://stripe.com/docs/testing
   - Recommended test card: `4242 4242 4242 4242` (Visa, succeeds)

3. **Price IDs Configuration:**
   - Update `priceId` fields in `lib/config/pricing.ts` with actual Stripe Price IDs
   - Create products and prices in Stripe Dashboard
   - Note: Currently pricing plans show "Join Waitlist" - need to update to use CheckoutButton

---

## 📋 Payment Flow Test Checklist

### 1. Billing Page Display

**Test:** `/dashboard/business/billing`

- [ ] **Billing Info Card**
  - [ ] Current plan name displays correctly
  - [ ] Credits count displays correctly
  - [ ] "Manage Billing" button works (Stripe Customer Portal)
  - [ ] "Upgrade Plan" button navigates to upgrade page

- [ ] **Upgrade Plan Section**
  - [ ] Pricing plans display correctly
  - [ ] Plan features listed correctly
  - [ ] Prices and billing cycles shown
  - [ ] "Popular" badge displays on recommended plan

- [ ] **Invoice List**
  - [ ] Past invoices display (if any)
  - [ ] Invoice details show correctly
  - [ ] Download invoice functionality works

---

### 2. Checkout Session Creation

**Test:** Clicking "Upgrade" or checkout button

- [ ] **Checkout Button Click**
  - [ ] Button is enabled and clickable
  - [ ] Loading state shows while processing
  - [ ] Error handling if Stripe not configured

- [ ] **API Call to `/api/stripe/checkout`**
  - [ ] Request includes `priceId`
  - [ ] Request includes `isSubscription` (true/false)
  - [ ] Request includes `trial` (if applicable)
  - [ ] User authentication verified
  - [ ] User exists in database (or created)

- [ ] **Stripe Checkout Session**
  - [ ] Session created successfully
  - [ ] Correct customer ID used
  - [ ] Correct price ID used
  - [ ] Success URL: `/dashboard/business/billing/success-payment`
  - [ ] Cancel URL: `/dashboard/business/billing/cancel-payment`
  - [ ] Redirects to Stripe Checkout page

---

### 3. Stripe Checkout Page

**Test:** On Stripe hosted checkout page

- [ ] **Checkout Page Display**
  - [ ] Correct plan/price shown
  - [ ] Customer email pre-filled
  - [ ] Payment method input works

- [ ] **Test Payment (Success)**
  - [ ] Use test card: `4242 4242 4242 4242`
  - [ ] Expiry: Any future date (e.g., `12/34`)
  - [ ] CVC: Any 3 digits (e.g., `123`)
  - [ ] ZIP: Any 5 digits (e.g., `12345`)
  - [ ] Click "Pay" button
  - [ ] Payment processes successfully
  - [ ] Redirects to success page

- [ ] **Test Payment (Cancel)**
  - [ ] Click "Cancel" or close checkout
  - [ ] Redirects to cancel page
  - [ ] No charges made

---

### 4. Payment Success Flow

**Test:** After successful payment

- [ ] **Success Page (`/dashboard/business/billing/success-payment`)**
  - [ ] Success message displays
  - [ ] Current plan updated correctly
  - [ ] Credits updated correctly (if applicable)
  - [ ] "View Billing Details" button works
  - [ ] "Start Generating" button works

- [ ] **Webhook Processing (`/api/webhook/stripe`)**
  - [ ] Webhook receives `checkout.session.completed` event
  - [ ] Webhook signature verified
  - [ ] User found in database
  - [ ] Plan updated in User document
  - [ ] Credits added to user account
  - [ ] Payment history record created
  - [ ] Invoice created (if applicable)
  - [ ] Clerk metadata updated

- [ ] **Database Updates**
  - [ ] User.plan.id updated
  - [ ] User.plan.name updated
  - [ ] User.plan.type updated
  - [ ] User.plan.price updated
  - [ ] User.plan.isPremium updated
  - [ ] User.credits incremented (if plan includes credits)
  - [ ] PaymentHistory record created
  - [ ] Invoice record created (if applicable)

- [ ] **Billing Page Refresh**
  - [ ] New plan displays correctly
  - [ ] Updated credits show correctly
  - [ ] Invoice appears in invoice list

---

### 5. Payment Cancel Flow

**Test:** After canceling payment

- [ ] **Cancel Page (`/dashboard/business/billing/cancel-payment`)**
  - [ ] Cancel message displays
  - [ ] "Back to Billing" button works
  - [ ] "Continue Browsing" button works
  - [ ] No charges made to card

- [ ] **No Database Changes**
  - [ ] User plan unchanged
  - [ ] Credits unchanged
  - [ ] No payment history created
  - [ ] No invoice created

---

### 6. Subscription Management

**Test:** Managing existing subscriptions

- [ ] **Stripe Customer Portal**
  - [ ] "Manage Billing" button works
  - [ ] Redirects to Stripe Customer Portal
  - [ ] Can view subscription details
  - [ ] Can update payment method
  - [ ] Can cancel subscription

- [ ] **Subscription Updates (Webhook)**
  - [ ] `customer.subscription.updated` event handled
  - [ ] Plan changes reflected in database
  - [ ] Credits updated if plan changed

- [ ] **Subscription Cancellation (Webhook)**
  - [ ] `customer.subscription.deleted` event handled
  - [ ] Plan downgraded to free
  - [ ] Subscription status updated

---

### 7. Credit Package Purchases

**Test:** One-time credit purchases

- [ ] **Credit Packages**
  - [ ] Credit packages display (if configured)
  - [ ] Can purchase credit packages
  - [ ] Credits added immediately after payment
  - [ ] Payment history recorded

---

## 🧪 Test Scenarios

### Scenario 1: New Subscription Purchase

1. Navigate to `/dashboard/business/billing`
2. Click "Upgrade Plan"
3. Select a subscription plan (e.g., Starter)
4. Click checkout button
5. Complete payment with test card
6. Verify redirect to success page
7. Verify plan updated in database
8. Verify credits added
9. Verify invoice created

**Expected Results:**
- ✅ User plan updated to selected plan
- ✅ Credits added according to plan
- ✅ Invoice created and visible
- ✅ Billing page shows new plan

---

### Scenario 2: Credit Package Purchase

1. Navigate to billing page
2. Select credit package (if available)
3. Complete checkout
4. Verify credits added immediately

**Expected Results:**
- ✅ Credits incremented by package amount
- ✅ Payment history recorded
- ✅ No plan change (stays on current plan)

---

### Scenario 3: Payment Cancellation

1. Start checkout process
2. Cancel or close checkout page
3. Verify redirect to cancel page
4. Verify no charges made
5. Verify no database changes

**Expected Results:**
- ✅ No charges on card
- ✅ Plan unchanged
- ✅ Credits unchanged
- ✅ No payment history created

---

### Scenario 4: Webhook Processing

1. Complete a test payment
2. Check server logs for webhook events
3. Verify webhook signature validation
4. Verify database updates
5. Verify Clerk metadata updates

**Expected Results:**
- ✅ Webhook received and verified
- ✅ All database updates completed
- ✅ Clerk metadata updated
- ✅ No errors in logs

---

## 🐛 Common Issues & Solutions

### Issue: Checkout button doesn't work

**Possible Causes:**
- Stripe not configured (`STRIPE_SECRET_KEY` missing)
- Price ID not set in pricing config
- User not authenticated

**Solutions:**
- Check environment variables
- Update `priceId` in `lib/config/pricing.ts`
- Verify user is logged in

---

### Issue: Webhook not processing

**Possible Causes:**
- Webhook secret not configured
- Webhook URL not set in Stripe Dashboard
- Signature verification failing

**Solutions:**
- Set `STRIPE_WEBHOOK_SECRET` environment variable
- Configure webhook endpoint in Stripe Dashboard
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhook/stripe`

---

### Issue: Credits not added after payment

**Possible Causes:**
- Webhook not received
- Plan not found in PricingPlans config
- Transaction failed

**Solutions:**
- Check webhook logs
- Verify plan `priceId` matches Stripe Price ID
- Check database transaction logs

---

### Issue: Plan not updated after payment

**Possible Causes:**
- Webhook processing failed
- Plan lookup failed (priceId mismatch)
- Database update failed

**Solutions:**
- Check webhook event logs
- Verify `priceId` in PricingPlans matches Stripe
- Check MongoDB for errors

---

## 🔍 Debugging Tips

1. **Check Server Logs:**
   - Look for "Checkout session created" messages
   - Look for "Webhook signature verified" messages
   - Look for "User successfully upgraded" messages

2. **Check Stripe Dashboard:**
   - View checkout sessions
   - View webhook events
   - Check payment intents

3. **Check Database:**
   - Verify User document updated
   - Check PaymentHistory collection
   - Check Invoice collection

4. **Use Stripe CLI for Local Testing:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```
   This forwards webhook events to your local server.

---

## 📝 Test Data

### Stripe Test Cards

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires Authentication:** `4000 0025 0000 3155`

### Test Webhook Events

Use Stripe CLI to trigger test events:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

---

## ✅ Success Criteria

Payment flow is working correctly when:

1. ✅ Checkout session created successfully
2. ✅ User redirected to Stripe Checkout
3. ✅ Payment processes successfully
4. ✅ Webhook received and verified
5. ✅ User plan updated in database
6. ✅ Credits added to user account
7. ✅ Invoice created (if applicable)
8. ✅ Success page displays updated information
9. ✅ Billing page shows new plan and credits

---

## 📊 Testing Status

- [ ] Billing Info Display
- [ ] Upgrade Plan Display
- [ ] Checkout Session Creation
- [ ] Stripe Checkout Page
- [ ] Payment Success Flow
- [ ] Payment Cancel Flow
- [ ] Webhook Processing
- [ ] Database Updates
- [ ] Subscription Management
- [ ] Credit Package Purchases

---

*Update this document as you test each component of the payment flow.*

