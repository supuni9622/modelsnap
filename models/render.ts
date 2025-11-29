import mongoose, { Schema } from "mongoose";

/**
 * Render Status Enum
 */
export type RenderStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Render Schema
 * Stores information about clothing renders
 */
const RenderSchema = new Schema(
  {
    // User who created the render
    userId: { type: String, required: true }, // Clerk user ID (indexed below)
    
    // Input images
    garmentImageUrl: { type: String, required: true }, // URL to uploaded garment
    avatarId: { type: String, required: true }, // Reference to Avatar model
    
    // Output
    renderedImageUrl: { type: String }, // URL to rendered result (legacy)
    outputS3Url: { type: String }, // S3 URL to rendered result (for frontend compatibility)
    outputUrl: { type: String }, // Alternative output URL field
    
    // Status tracking
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      required: true,
    },
    
    // Credits and billing
    creditsUsed: { type: Number, default: 1, required: true }, // Credits consumed for this render
    
    // FASHN API tracking
    fashnRequestId: { type: String }, // FASHN API request ID for tracking
    
    // Error handling
    errorMessage: { type: String }, // Error message if render failed
    
    // Retry information
    retryCount: { type: Number, default: 0 }, // Number of retry attempts
    maxRetries: { type: Number, default: 3 }, // Maximum retry attempts
    lastRetryAt: { type: Date }, // Last retry timestamp
    failureReason: { type: String }, // Detailed failure reason
    failureCode: { type: String }, // Error code for categorization
    
    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for efficient queries
RenderSchema.index({ userId: 1, createdAt: -1 }); // User's render history
RenderSchema.index({ status: 1 }); // Filter by status
RenderSchema.index({ createdAt: -1 }); // Recent renders

const Render = mongoose.models.Render || mongoose.model("Render", RenderSchema);

export default Render;



