import mongoose, { Schema } from "mongoose";

/**
 * Render Queue Schema
 * Manages batch rendering requests in a queue
 */
export type QueueStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type QueuePriority = "low" | "normal" | "high";

const RenderQueueSchema = new Schema(
  {
    // User who created the batch
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Batch identifier
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Queue status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      required: true,
      index: true,
    },

    // Priority level
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
      index: true,
    },

    // Render requests in this batch
    requests: [
      {
        garmentImageUrl: { type: String, required: true },
        avatarId: { type: String },
        avatarImageUrl: { type: String },
        modelId: { type: Schema.Types.ObjectId, ref: "ModelProfile" },
        modelType: { type: String, enum: ["AI_AVATAR", "HUMAN_MODEL"], required: true },
        status: {
          type: String,
          enum: ["pending", "processing", "completed", "failed"],
          default: "pending",
        },
        generationId: { type: Schema.Types.ObjectId, ref: "Generation" },
        renderId: { type: Schema.Types.ObjectId, ref: "Render" },
        errorMessage: { type: String },
        retryCount: { type: Number, default: 0 },
      },
    ],

    // Progress tracking
    totalRequests: { type: Number, required: true },
    completedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    processingCount: { type: Number, default: 0 },

    // Processing information
    startedAt: { type: Date },
    completedAt: { type: Date },
    processedBy: { type: String }, // Worker identifier

    // Error information
    errorMessage: { type: String },
    failureReason: { type: String },
  },
  { timestamps: true }
);

// Indexes for efficient queue processing
RenderQueueSchema.index({ status: 1, priority: -1, createdAt: 1 }); // Queue processing order
RenderQueueSchema.index({ userId: 1, createdAt: -1 }); // User's batch history
RenderQueueSchema.index({ batchId: 1 }); // Batch lookup

const RenderQueue =
  mongoose.models.RenderQueue || mongoose.model("RenderQueue", RenderQueueSchema);

export default RenderQueue;

