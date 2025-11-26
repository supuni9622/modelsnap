import mongoose, { Schema } from "mongoose";

/**
 * Avatar Schema
 * Stores metadata for AI-generated avatars
 */
const AvatarSchema = new Schema(
  {
    // Unique identifier
    id: { 
      type: String, 
      default: () => new mongoose.Types.ObjectId().toString(), 
      unique: true 
    },
    
    // Avatar characteristics
    gender: { type: String, required: true, enum: ["male", "female"] },
    bodyType: { type: String, required: true },
    skinTone: { type: String, required: true }, // SL-01, SL-02, etc.
    
    // Image information
    imageUrl: { type: String, required: true }, // S3 URL (publicly accessible) or path relative to public folder
    modelId: { type: String }, // FASHN model ID if available
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for efficient queries
AvatarSchema.index({ gender: 1, bodyType: 1, skinTone: 1 });
AvatarSchema.index({ gender: 1 });

const Avatar = mongoose.models.Avatar || mongoose.model("Avatar", AvatarSchema);

export default Avatar;

