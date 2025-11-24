import mongoose, { Schema } from "mongoose";

/**
 * Business Profile Schema
 * Stores business-specific information and settings
 */
const BusinessProfileSchema = new Schema(
  {
    // Link to user
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      // Indexed below
    },

    // Business information
    businessName: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    // Credits and subscription
    aiCredits: {
      type: Number,
      default: 0,
      required: true,
    },

    // New credit system fields
    subscriptionTier: {
      type: String,
      enum: ["free", "starter", "growth"],
      default: "free",
      // Indexed below
    },

    aiCreditsRemaining: {
      type: Number,
      default: 3,
      required: true,
    },

    aiCreditsTotal: {
      type: Number,
      default: 3,
      required: true,
    },

    stripeSubscriptionId: {
      type: String,
      // Indexed below
    },

    lemonsqueezySubscriptionId: {
      type: String,
      // Indexed below
    },

    subscriptionCurrentPeriodEnd: {
      type: Date,
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "past_due", "canceled", "trialing"],
      default: "active",
    },

    // Free tier credit reset tracking
    lastCreditReset: {
      type: Date,
      default: Date.now,
    },

    creditResetDay: {
      type: Number,
      default: new Date().getDate(), // Day of month (1-31)
    },

    // Human model access
    approvedModels: [
      {
        type: Schema.Types.ObjectId,
        ref: "ModelProfile",
      },
    ],

    purchasedModels: [
      {
        type: Schema.Types.ObjectId,
        ref: "ModelProfile",
      },
    ],

    // Payment integration
    stripeCustomerId: {
      type: String,
      // Indexed below
    },

    lemonsqueezyCustomerId: {
      type: String,
    },

    webxpayCustomerId: {
      type: String,
    },

    // Package reference
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
// Note: userId already has a unique index from unique: true, so we don't need to define it again
BusinessProfileSchema.index({ subscriptionStatus: 1 }); // Legacy field
BusinessProfileSchema.index({ subscriptionTier: 1 });
BusinessProfileSchema.index({ stripeCustomerId: 1 });
BusinessProfileSchema.index({ stripeSubscriptionId: 1 });
BusinessProfileSchema.index({ lemonsqueezySubscriptionId: 1 });
BusinessProfileSchema.index({ subscriptionCurrentPeriodEnd: 1 });
BusinessProfileSchema.index({ purchasedModels: 1 });

const BusinessProfile =
  mongoose.models.BusinessProfile ||
  mongoose.model("BusinessProfile", BusinessProfileSchema);

export default BusinessProfile;

