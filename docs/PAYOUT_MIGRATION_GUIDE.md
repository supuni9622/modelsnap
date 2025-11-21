# Payout System Migration Guide

## Overview

This guide explains how to migrate from the embedded `payoutRequests` array in `ModelProfile` to the new separate `PayoutRequest` collection.

## Why Migrate?

The new system provides:
- ✅ Better scalability (no document size limits)
- ✅ Improved querying and indexing
- ✅ Complete audit trail
- ✅ Support for batch processing
- ✅ Better separation of concerns

## Migration Steps

### Step 1: Backup Data

```bash
# Export existing ModelProfile documents
mongoexport --db modelsnap --collection modelprofiles --out modelprofiles_backup.json
```

### Step 2: Run Migration Script

```typescript
// scripts/migrate-payouts.ts
import mongoose from "mongoose";
import ModelProfile from "@/models/model-profile";
import PayoutRequest from "@/models/payout-request";

async function migratePayouts() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const models = await ModelProfile.find({
    payoutRequests: { $exists: true, $ne: [] },
  });

  for (const model of models) {
    if (model.payoutRequests && model.payoutRequests.length > 0) {
      for (const payout of model.payoutRequests) {
        await PayoutRequest.create({
          modelId: model._id,
          userId: model.userId,
          amount: Math.round(payout.amount * 100), // Convert to cents
          currency: "USD",
          paymentMethod: payout.paymentMethod || "bank_transfer",
          accountDetails: payout.accountDetails || {},
          status: payout.status || "pending",
          transactionId: payout.transactionId,
          processedAt: payout.processedAt,
          createdAt: payout.requestedAt || model.createdAt,
          statusHistory: [
            {
              status: payout.status || "pending",
              changedBy: model.userId,
              changedAt: payout.requestedAt || model.createdAt,
              reason: "Migrated from ModelProfile",
            },
          ],
        });
      }
    }
  }

  console.log("Migration completed!");
  mongoose.disconnect();
}

migratePayouts();
```

### Step 3: Verify Migration

```typescript
// Verify all payouts migrated
const oldCount = await ModelProfile.aggregate([
  { $project: { count: { $size: "$payoutRequests" } } },
  { $group: { _id: null, total: { $sum: "$count" } } },
]);

const newCount = await PayoutRequest.countDocuments();

console.log(`Old: ${oldCount[0]?.total || 0}, New: ${newCount}`);
```

### Step 4: Remove Old Field (After Verification)

```typescript
// Remove payoutRequests array from all documents
await ModelProfile.updateMany(
  {},
  { $unset: { payoutRequests: "" } }
);
```

### Step 5: Update Schema

The `ModelProfile` schema has already been updated to remove the `payoutRequests` array. The `pendingPayouts` field remains for tracking reserved amounts.

## Rollback Plan

If you need to rollback:

1. Restore from backup
2. The old code will still work (it checks for both old and new systems)
3. Re-run migration after fixing issues

## Testing Checklist

- [ ] All payout requests migrated
- [ ] Amounts match (check totals)
- [ ] Statuses preserved
- [ ] Account details intact
- [ ] Model balances unchanged
- [ ] Admin can view payouts
- [ ] Models can view their payout history
- [ ] New payout requests work correctly

