import mongoose, { Schema } from "mongoose";

/**
 * Model Profile Schema
 * Stores human model profile information and settings
 */
const ModelProfileSchema = new Schema(
  {
    // Link to user
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      // Indexed below
    },

    // Public information
    name: {
      type: String,
      required: true,
    },

    // Royalty tracking (deprecated - kept for backward compatibility)
    royaltyBalance: {
      type: Number,
      default: 0,
      required: true,
    },

    // Model purchase price (in cents)
    price: {
      type: Number,
      default: 0,
      required: true,
      // Model can set their purchase price
    },

    // Total earnings from purchases (90% of purchase price)
    availableBalance: {
      type: Number,
      default: 0,
      required: true,
      // Accumulated from model purchases
    },

    // Whether consent is required before purchase
    consentRequired: {
      type: Boolean,
      default: false,
      required: true,
    },

    // Reference images (3-4 images stored in S3)
    referenceImages: [
      {
        type: String, // S3 URLs
        required: true,
      },
    ],

    // Approved businesses (whitelist)
    approvedBusinesses: [
      {
        type: Schema.Types.ObjectId,
        ref: "BusinessProfile",
      },
    ],

    // Consent and status
    consentSigned: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "paused", "inactive"],
      default: "active",
      // Indexed below
    },

    // FASHN model ID if available
    fashnModelId: {
      type: String,
    },

    // Payout management
    // Note: Payout requests are stored in separate PayoutRequest collection
    // This field tracks the total amount reserved for pending/processing payouts
    pendingPayouts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
ModelProfileSchema.index({ userId: 1 });
ModelProfileSchema.index({ status: 1 });
ModelProfileSchema.index({ royaltyBalance: -1 }); // For sorting by earnings

const ModelProfile =
  mongoose.models.ModelProfile ||
  mongoose.model("ModelProfile", ModelProfileSchema);

export default ModelProfile;

