import mongoose, { Schema } from "mongoose";

/**
 * Generation Schema
 * Stores information about all image generations (AI Avatar or Human Model)
 * This replaces/enhances the Render model to align with full schema
 */
export type GenerationStatus = "pending" | "processing" | "completed" | "failed";
export type ModelType = "AI_AVATAR" | "HUMAN_MODEL";

const GenerationSchema = new Schema(
  {
    // Business user who created the generation
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Model used (null for AI avatar)
    modelId: {
      type: Schema.Types.ObjectId,
      ref: "ModelProfile",
      default: null,
      index: true,
    },

    // AI Avatar used (null for human model)
    avatarId: {
      type: Schema.Types.ObjectId,
      ref: "Avatar",
      default: null,
    },

    // Type of generation
    modelType: {
      type: String,
      enum: ["AI_AVATAR", "HUMAN_MODEL"],
      required: true,
      index: true,
    },

    // Input image
    garmentImageUrl: {
      type: String,
      required: true, // S3 URL of uploaded garment
    },

    // Output image
    outputS3Url: {
      type: String,
      // Final generated image S3 URL
    },

    // Royalty and credits
    royaltyPaid: {
      type: Number,
      default: 0, // $2.00 if human model, $0 otherwise
    },

    creditsUsed: {
      type: Number,
      default: 1, // 1 for AI avatar, 0 for human model (charged separately)
    },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      required: true,
      index: true,
    },

    // FASHN API tracking
    fashnRequestId: {
      type: String,
      // FASHN API request ID for tracking
    },

    // Error handling
    errorMessage: {
      type: String,
      // Error message if generation failed
    },

    // Retry information
    retryCount: {
      type: Number,
      default: 0,
      // Number of retry attempts
    },

    maxRetries: {
      type: Number,
      default: 3,
      // Maximum retry attempts
    },

    lastRetryAt: {
      type: Date,
      // Last retry timestamp
    },

    failureReason: {
      type: String,
      // Detailed failure reason for analysis
    },

    failureCode: {
      type: String,
      // Error code for categorization (e.g., "API_ERROR", "TIMEOUT", "VALIDATION_ERROR")
    },

    // Timestamp
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
GenerationSchema.index({ userId: 1, generatedAt: -1 }); // User's generation history
GenerationSchema.index({ modelId: 1, generatedAt: -1 }); // Model's royalty tracking
GenerationSchema.index({ status: 1, generatedAt: -1 }); // Status queries

const Generation =
  mongoose.models.Generation ||
  mongoose.model("Generation", GenerationSchema);

export default Generation;

