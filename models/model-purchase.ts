import mongoose, { Schema } from "mongoose";

/**
 * Model Purchase Schema
 * Tracks one-time purchases of human models by businesses
 * Platform takes 10% commission, model receives 90%
 */
const ModelPurchaseSchema = new Schema(
  {
    // Business that purchased the model
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "BusinessProfile",
      required: true,
      // Indexed below
    },

    // Model that was purchased
    modelId: {
      type: Schema.Types.ObjectId,
      ref: "ModelProfile",
      required: true,
      // Indexed below
    },

    // Stripe payment information (kept for backward compatibility)
    stripePaymentIntentId: {
      type: String,
      // Indexed below
    },

    stripeCheckoutSessionId: {
      type: String,
      // Indexed below
    },

    // Lemon Squeezy payment information
    lemonsqueezyOrderId: {
      type: String,
      // Indexed below
    },

    lemonsqueezyCheckoutId: {
      type: String,
      // Indexed below
    },

    // Financial details
    amount: {
      type: Number,
      required: true,
      // Total purchase price in cents
    },

    currency: {
      type: String,
      default: "usd",
      required: true,
    },

    platformCommission: {
      type: Number,
      required: true,
      // 10% of amount in cents
    },

    modelEarnings: {
      type: Number,
      required: true,
      // 90% of amount in cents
    },

    // Purchase status
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      required: true,
      // Indexed below
    },

    // Timestamps
    purchasedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
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
ModelPurchaseSchema.index({ businessId: 1, modelId: 1 }); // Check if business purchased model
ModelPurchaseSchema.index({ modelId: 1, status: 1 }); // Get all purchases for a model
ModelPurchaseSchema.index({ businessId: 1, status: 1 }); // Get all purchases for a business
ModelPurchaseSchema.index({ stripePaymentIntentId: 1 });
ModelPurchaseSchema.index({ stripeCheckoutSessionId: 1 });
ModelPurchaseSchema.index({ lemonsqueezyOrderId: 1 });
ModelPurchaseSchema.index({ lemonsqueezyCheckoutId: 1 });
ModelPurchaseSchema.index({ status: 1 });

// Compound unique index to prevent duplicate purchases
// Note: Removed unique constraint to allow multiple payment providers
// Validation is handled at application level
ModelPurchaseSchema.index(
  { businessId: 1, modelId: 1, status: 1 }
);

const ModelPurchase =
  mongoose.models.ModelPurchase ||
  mongoose.model("ModelPurchase", ModelPurchaseSchema);

export default ModelPurchase;

