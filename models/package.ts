import mongoose, { Schema } from "mongoose";

/**
 * Package Schema
 * Stores subscription and credit package information
 */
const PackageSchema = new Schema(
  {
    // Stripe integration
    stripePriceId: {
      type: String,
      unique: true,
      sparse: true, // Allow null values but ensure uniqueness when present
      index: true,
    },

    // Lemon Squeezy integration
    lemonsqueezyVariantId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Package information
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    // Credits and features
    aiCreditsGranted: {
      type: Number,
      required: true,
      default: 0,
    },

    humanModelAccess: {
      type: Boolean,
      default: false,
    },

    // Pricing
    price: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "usd",
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "one-time"],
      default: "monthly",
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Plan identifier (for matching with frontend config)
    planId: {
      type: String,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
PackageSchema.index({ isActive: 1 });
PackageSchema.index({ planId: 1 });

const Package =
  mongoose.models.Package || mongoose.model("Package", PackageSchema);

export default Package;

