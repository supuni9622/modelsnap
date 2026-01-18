import { Credits } from "@/lib/config/pricing";
import mongoose, { Schema } from "mongoose";

/**
 * User Schema
 * Stores user information linked to Clerk authentication
 * Note: The `id` field stores the Clerk user ID for authentication
 */
const UserSchema = new Schema(
  {
    // Clerk user ID (stored in `id` field for backward compatibility)
    // This is the primary identifier used throughout the codebase
    id: {
      type: String,
      required: true,
      unique: true,
      // Don't use index: true here - we define it separately below
    },

    // User information from Clerk
    emailAddress: [{ type: String }],
    firstName: { type: String },
    lastName: { type: String },
    picture: { type: String },

    // Role-based access control
    role: {
      type: String,
      default: null, // No default - user must choose role in onboarding
      validate: {
        validator: function(v: string | null | undefined) {
          // Allow null/undefined or valid role values
          return v === null || v === undefined || ["BUSINESS", "MODEL", "ADMIN"].includes(v);
        },
        message: "{VALUE} is not a valid role",
      },
      // Don't use index: true here - we define it separately below
    },

    // Payment provider customer IDs
    stripeCustomerId: { type: String },
    lemonsqueezyCustomerId: { type: String },
    webxpayCustomerId: { type: String },

    // Credits and subscription
    credits: {
      type: Number,
      default: Credits.freeCredits,
      required: true,
    },

    // Subscription plan details
    plan: {
      id: { type: String }, // Plan identifier (e.g., "free", "starter", "growth")
      type: { type: String, default: "free" }, // Plan type: "free" or subscription type
      planType: { type: String }, // Legacy field - kept for backward compatibility
      name: { type: String }, // Display name of the plan
      price: { type: String }, // Plan price as string
      isPremium: { type: Boolean, default: false }, // Whether plan includes premium features
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
// Note: id field already has an index from unique: true, so we don't need to define it again
UserSchema.index({ role: 1 }); // Role-based queries
UserSchema.index({ stripeCustomerId: 1 }); // Payment lookups
UserSchema.index({ emailAddress: 1 }); // Email lookups

// Virtual for backward compatibility - allows accessing id as clerkId
UserSchema.virtual("clerkId").get(function () {
  return this.id;
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
