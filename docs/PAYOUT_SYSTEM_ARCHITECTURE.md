# Payout System Architecture - Production Guide

## Overview

The payout system is designed for production use with proper separation of concerns, audit trails, and scalability in mind.

## Architecture

### 1. **Separate PayoutRequest Model**

Instead of storing payout requests as an array in `ModelProfile`, we use a dedicated `PayoutRequest` collection for:

- **Better Querying**: Indexed queries for status, dates, amounts
- **Scalability**: No document size limits
- **Audit Trail**: Complete status history
- **Transaction Tracking**: Unique reference numbers
- **Batch Processing**: Support for scheduled payouts

### 2. **State Machine**

Payout requests follow a clear state machine:

```
pending → under_review → approved → processing → completed
   ↓           ↓            ↓
rejected    rejected    failed
```

**States:**
- `pending`: Initial request submitted
- `under_review`: Admin is reviewing
- `approved`: Approved, ready for processing
- `processing`: Payment being processed by provider
- `completed`: Successfully paid
- `failed`: Payment processing failed
- `rejected`: Rejected by admin
- `cancelled`: Cancelled by model

### 3. **Balance Management**

**ModelProfile Fields:**
- `royaltyBalance`: Available balance (can request payout)
- `pendingPayouts`: Amount reserved for pending/processing payouts

**Flow:**
1. Model requests payout → Amount deducted from `royaltyBalance`, added to `pendingPayouts`
2. Payout approved → Amount stays in `pendingPayouts`
3. Payout completed → Amount removed from `pendingPayouts`
4. Payout rejected/failed → Amount refunded to `royaltyBalance`, removed from `pendingPayouts`

### 4. **Transaction Reference**

Each payout gets a unique reference: `PAY-YYYYMMDD-XXXXXX`
- Human-readable
- Sortable by date
- Unique identifier for support

### 5. **Audit Trail**

Every status change is recorded in `statusHistory`:
- Previous status
- New status
- Changed by (admin user ID)
- Timestamp
- Reason/notes

### 6. **Payment Provider Integration**

**Supported Methods:**
- Bank Transfer (manual processing)
- PayPal (via PayPal Payouts API)
- Stripe (via Stripe Connect)
- Wire Transfer (manual)
- Check (manual)

**Account Details:**
- Stored in `accountDetails` field
- **⚠️ Should be encrypted in production**
- Supports different fields per payment method

### 7. **Fees and Net Amount**

- `amount`: Gross payout amount
- `platformFee`: Platform fee (if applicable)
- `processingFee`: Payment provider fee
- `netAmount`: Amount model receives (calculated automatically)

### 8. **Retry Logic**

- `retryCount`: Number of retry attempts
- `lastRetryAt`: Last retry timestamp
- `failureReason`: Why it failed
- `failureCode`: Error code for programmatic handling

## API Endpoints

### Model Endpoints

**POST /api/model/payout/request**
- Create new payout request
- Validates minimum amount ($10)
- Checks available balance
- Creates `PayoutRequest` document
- Updates `ModelProfile` balances atomically

**GET /api/model/payout/request**
- Get payout request history
- Returns last 50 requests
- Includes status and amounts

### Admin Endpoints

**GET /api/admin/payouts**
- List all pending/approved/processing payouts
- Includes model and user information
- Sorted by creation date

**POST /api/admin/payouts**
- Process payout (approve/reject/complete/fail)
- Updates status with audit trail
- Handles balance updates atomically
- Supports transaction ID tracking

## Utility Functions

### `createPayoutRequest()`
- Validates amount and balance
- Creates payout request atomically
- Updates model profile balances
- Returns success/error

### `processPayoutRequest()`
- Updates payout status
- Maintains audit trail
- Handles balance refunds on rejection/failure
- Supports transaction ID tracking

### `getPayoutStats()`
- Aggregates payout statistics
- Total paid, pending amount
- Count of completed/pending payouts

## Production Considerations

### 1. **Security**

- **Encrypt Account Details**: Use field-level encryption for sensitive data
- **Access Control**: Admin-only endpoints with role verification
- **Rate Limiting**: Prevent payout request spam
- **Input Validation**: Sanitize all user inputs

### 2. **Compliance**

- **Tax Forms**: Track `taxFormRequired` and `taxFormSubmitted`
- **KYC Verification**: Verify model identity before large payouts
- **1099 Forms**: Generate tax forms for US models
- **Record Keeping**: Maintain complete audit trail

### 3. **Payment Provider Integration**

**Stripe Connect:**
```typescript
// Example: Process payout via Stripe Connect
const transfer = await stripe.transfers.create({
  amount: payoutRequest.netAmount,
  currency: payoutRequest.currency,
  destination: payoutRequest.accountDetails.stripeAccountId,
});
```

**PayPal Payouts:**
```typescript
// Example: Process payout via PayPal
const payout = await paypal.payouts.create({
  sender_batch_header: {
    email_subject: "ModelSnap Payout",
  },
  items: [{
    recipient_type: "EMAIL",
    amount: { value: payoutRequest.netAmount, currency: payoutRequest.currency },
    receiver: payoutRequest.accountDetails.paypalEmail,
  }],
});
```

### 4. **Batch Processing**

For efficiency, process payouts in batches:

```typescript
// Scheduled job (daily/weekly)
const pendingPayouts = await PayoutRequest.find({
  status: "approved",
  scheduledFor: { $lte: new Date() },
}).limit(100);

// Process in batch
for (const payout of pendingPayouts) {
  await processPayoutViaProvider(payout);
}
```

### 5. **Error Handling**

- **Retry Logic**: Automatic retry for transient failures
- **Failure Notifications**: Email model on failure
- **Manual Review**: Flag suspicious payouts for review
- **Refund on Failure**: Automatically refund to balance

### 6. **Monitoring**

- **Payout Success Rate**: Track completion vs failure
- **Average Processing Time**: Monitor performance
- **Pending Payout Queue**: Alert if queue grows too large
- **Failed Payout Alerts**: Notify admins of failures

### 7. **Database Indexes**

Optimized indexes for common queries:
- `{ modelId: 1, createdAt: -1 }`: Model's payout history
- `{ userId: 1, status: 1, createdAt: -1 }`: User's payouts by status
- `{ status: 1, scheduledFor: 1 }`: Batch processing
- `{ transactionReference: 1 }`: Unique lookup

## Migration from Old System

If migrating from the embedded `payoutRequests` array:

1. Export existing payout requests from `ModelProfile`
2. Create `PayoutRequest` documents
3. Update balances to match
4. Remove `payoutRequests` array from `ModelProfile` schema

## Best Practices

1. **Always use transactions** for balance updates
2. **Validate amounts** before processing
3. **Maintain audit trail** for all status changes
4. **Encrypt sensitive data** (account numbers, etc.)
5. **Set minimum payout thresholds** to reduce processing costs
6. **Schedule batch processing** for efficiency
7. **Monitor and alert** on failures
8. **Keep complete records** for tax/compliance

## Future Enhancements

- **Automatic Payouts**: Scheduled weekly/monthly payouts
- **Multi-currency Support**: Handle different currencies
- **Payment Provider Webhooks**: Real-time status updates
- **Payout Dashboard**: Analytics and reporting
- **Tax Form Generation**: Automatic 1099 generation
- **KYC Integration**: Identity verification before payouts

