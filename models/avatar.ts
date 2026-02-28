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

    // Optional: framing (Full Body, Three-Quarter, Upper Body, Lower Body, Back View)
    photoFraming: { type: String, enum: ["full-body", "half-body", "three-quarter", "upper-body", "lower-body", "back-view"] },

    // Optional: aspect ratio / format (2:3 Portrait, 1:1 Square, 4:5 Vertical, 16:9 Landscape)
    aspectRatio: { type: String, enum: ["2:3", "1:1", "4:5", "16:9"] },

    // Optional: skin tone category for filtering (light, medium, deep)
    skinToneCategory: { type: String, enum: ["light", "medium", "deep"] },

    // Optional: background (indoor, outdoor)
    background: { type: String, enum: ["indoor", "outdoor"] },

    // Controls whether this avatar should be shown in the UI
    // Missing value is treated as visible by API queries for backward compatibility
    visible: { type: Boolean, default: true, index: true },

    // Metadata
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for efficient queries
AvatarSchema.index({ gender: 1, bodyType: 1, skinTone: 1 });
AvatarSchema.index({ gender: 1 });
AvatarSchema.index({ photoFraming: 1 });
AvatarSchema.index({ aspectRatio: 1 });
AvatarSchema.index({ skinToneCategory: 1 });
AvatarSchema.index({ background: 1 });
AvatarSchema.index({ visible: 1 });

const Avatar = mongoose.models.Avatar || mongoose.model("Avatar", AvatarSchema);

export default Avatar;

