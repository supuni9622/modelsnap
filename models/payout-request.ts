import mongoose, { Schema } from "mongoose";

/**
 * Payout Request Schema
 * Production-ready payout request model with proper state management and audit trails
 */
const PayoutRequestSchema = new Schema(
  {
    // Link to model profile
    modelId: {
      type: Schema.Types.ObjectId,
      ref: "ModelProfile",
      required: true,
      index: true,
    },

    // Link to user for quick access
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Payout amount (in USD cents for precision)
    amount: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },

    // Currency (default USD)
    currency: {
      type: String,
      default: "USD",
      required: true,
    },

    // Payment method
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "paypal", "stripe", "wire_transfer", "check"],
      required: true,
      index: true,
    },

    // Payment provider details (e.g., Stripe Connect account ID)
    paymentProviderId: {
      type: String,
      index: true,
    },

    // Account details (encrypted in production)
    accountDetails: {
      // Bank transfer details
      bankName: { type: String },
      accountNumber: { type: String }, // Should be encrypted
      accountHolderName: { type: String },
      routingNumber: { type: String }, // For US banks
      swiftCode: { type: String }, // For international transfers
      iban: { type: String }, // For international transfers

      // PayPal details
      paypalEmail: { type: String },

      // Stripe details
      stripeAccountId: { type: String },

      // Additional notes
      notes: { type: String },
    },

    // Payout status with state machine
    status: {
      type: String,
      enum: [
        "pending", // Initial request
        "under_review", // Admin is reviewing
        "approved", // Approved, ready for processing
        "processing", // Payment being processed
        "completed", // Successfully paid
        "failed", // Payment failed
        "rejected", // Rejected by admin
        "cancelled", // Cancelled by model
      ],
      default: "pending",
      required: true,
      index: true,
    },

    // Status history for audit trail
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String },
        notes: { type: String },
      },
    ],

    // Processing information
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // Admin who processed
    },

    processedAt: {
      type: Date,
    },

    // Transaction tracking
    transactionId: {
      type: String, // External transaction ID from payment provider
      index: true,
    },

    transactionReference: {
      type: String, // Internal reference number
      unique: true,
      sparse: true,
    },

    // Failure information
    failureReason: {
      type: String,
    },

    failureCode: {
      type: String,
    },

    // Retry information
    retryCount: {
      type: Number,
      default: 0,
    },

    lastRetryAt: {
      type: Date,
    },

    // Tax and compliance
    taxFormRequired: {
      type: Boolean,
      default: false,
    },

    taxFormSubmitted: {
      type: Boolean,
      default: false,
    },

    // Fees (platform fees, processing fees)
    platformFee: {
      type: Number,
      default: 0,
    },

    processingFee: {
      type: Number,
      default: 0,
    },

    netAmount: {
      type: Number, // amount - platformFee - processingFee
      required: true,
    },

    // Scheduled payout (for batch processing)
    scheduledFor: {
      type: Date,
      index: true,
    },

    // Batch processing
    batchId: {
      type: String,
      index: true,
    },

    // Additional metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
PayoutRequestSchema.index({ modelId: 1, createdAt: -1 }); // Model's payout history
PayoutRequestSchema.index({ userId: 1, status: 1, createdAt: -1 }); // User's payouts by status
PayoutRequestSchema.index({ status: 1, scheduledFor: 1 }); // Batch processing queries
PayoutRequestSchema.index({ createdAt: -1 }); // Recent payouts
PayoutRequestSchema.index({ transactionReference: 1 }); // Unique reference lookup

// Generate transaction reference before save
PayoutRequestSchema.pre("save", async function (next) {
  if (this.isNew && !this.transactionReference) {
    // Generate unique reference: PAY-YYYYMMDD-XXXXXX
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.transactionReference = `PAY-${date}-${random}`;
  }

  // Calculate net amount
  if (this.isModified("amount") || this.isModified("platformFee") || this.isModified("processingFee")) {
    this.netAmount = this.amount - (this.platformFee || 0) - (this.processingFee || 0);
  }

  next();
});

// Method to update status with audit trail
PayoutRequestSchema.methods.updateStatus = async function (
  newStatus: string,
  changedBy: string,
  reason?: string,
  notes?: string
) {
  this.statusHistory.push({
    status: this.status,
    changedBy: changedBy,
    changedAt: new Date(),
    reason: reason,
    notes: notes,
  });

  this.status = newStatus;
  if (newStatus === "processing" || newStatus === "completed") {
    this.processedAt = new Date();
  }

  await this.save();
};

const PayoutRequest =
  mongoose.models.PayoutRequest ||
  mongoose.model("PayoutRequest", PayoutRequestSchema);

export default PayoutRequest;

