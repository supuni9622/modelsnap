import mongoose, { Schema } from "mongoose";

/**
 * Consent Request Schema
 * Manages consent requests between businesses and models
 * Critical: One-time consent per business-model pair
 */
const ConsentRequestSchema = new Schema(
  {
    // Business requesting consent
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "BusinessProfile",
      required: true,
      index: true,
    },

    // Model being asked
    modelId: {
      type: Schema.Types.ObjectId,
      ref: "ModelProfile",
      required: true,
      index: true,
    },

    // Request status
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
      default: "PENDING",
      required: true,
      index: true,
    },

    // Timestamps
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      // Optional: consent requests can expire after a certain period
    },

    grantedAt: {
      type: Date,
    },

    rejectedAt: {
      type: Date,
    },

    // Optional message from business
    message: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index for quick lookup: business + model
ConsentRequestSchema.index({ businessId: 1, modelId: 1 }, { unique: true });

// Index for status queries
ConsentRequestSchema.index({ status: 1, requestedAt: -1 });

const ConsentRequest =
  mongoose.models.ConsentRequest ||
  mongoose.model("ConsentRequest", ConsentRequestSchema);

export default ConsentRequest;

