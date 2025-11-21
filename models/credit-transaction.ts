import mongoose, { Schema } from "mongoose";

/**
 * Credit Transaction Schema
 * Tracks all credit adjustments (additions, deductions, admin adjustments)
 */
const CreditTransactionSchema = new Schema(
  {
    // User whose credits are being adjusted
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Transaction type
    type: {
      type: String,
      enum: ["ADJUSTMENT", "PURCHASE", "GENERATION", "REFUND", "ADMIN_ADJUSTMENT"],
      required: true,
      index: true,
    },

    // Amount (positive for additions, negative for deductions)
    amount: {
      type: Number,
      required: true,
    },

    // Balance after this transaction
    balanceAfter: {
      type: Number,
      required: true,
    },

    // Reason/description
    reason: {
      type: String,
      required: true,
    },

    // Admin who made the adjustment (if applicable)
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Related entities (optional)
    relatedInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },

    relatedGenerationId: {
      type: Schema.Types.ObjectId,
      ref: "Generation",
      default: null,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
CreditTransactionSchema.index({ userId: 1, createdAt: -1 }); // User's transaction history
CreditTransactionSchema.index({ type: 1, createdAt: -1 }); // Type queries
CreditTransactionSchema.index({ adminUserId: 1, createdAt: -1 }); // Admin activity

const CreditTransaction =
  mongoose.models.CreditTransaction ||
  mongoose.model("CreditTransaction", CreditTransactionSchema);

export default CreditTransaction;

