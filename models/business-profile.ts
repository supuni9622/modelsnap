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
      index: true,
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

    subscriptionStatus: {
      type: String,
      enum: ["FREE", "STARTER", "GROWTH", "CANCELLED"],
      default: "FREE",
      index: true,
    },

    // Human model access
    approvedModels: [
      {
        type: Schema.Types.ObjectId,
        ref: "ModelProfile",
      },
    ],

    // Payment integration
    stripeCustomerId: {
      type: String,
      index: true,
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
BusinessProfileSchema.index({ userId: 1 });
BusinessProfileSchema.index({ subscriptionStatus: 1 });
BusinessProfileSchema.index({ stripeCustomerId: 1 });

const BusinessProfile =
  mongoose.models.BusinessProfile ||
  mongoose.model("BusinessProfile", BusinessProfileSchema);

export default BusinessProfile;

