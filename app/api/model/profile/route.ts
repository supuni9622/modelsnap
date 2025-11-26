import { connectDB } from "@/lib/db";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/model/profile
 * Get the current authenticated user's model profile
 * Requires authentication and MODEL role
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.API)(
  async (req: NextRequest) => {
    try {
      await connectDB();

      // Get authenticated user
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          {
            status: "error",
            message: "Unauthorized",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      // Get user from database
      const user = await User.findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          {
            status: "error",
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Find model profile
      const modelProfile = await ModelProfile.findOne({ userId: user._id })
        .populate("userId", "firstName lastName picture emailAddress")
        .lean();

      if (!modelProfile) {
        return NextResponse.json(
          {
            status: "error",
            message: "Model profile not found",
            code: "PROFILE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          status: "success",
          data: modelProfile,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("Error fetching model profile:", err);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to fetch model profile",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/model/profile
 * Update the current authenticated user's model profile
 * Supports both portfolio and personal information fields
 */
export const PUT = withRateLimit(RATE_LIMIT_CONFIGS.API)(
  async (req: NextRequest) => {
    try {
      await connectDB();

      // Get authenticated user
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          {
            status: "error",
            message: "Unauthorized",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      // Get user from database
      const user = await User.findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          {
            status: "error",
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const body = await req.json();

      // Check if profile exists
      const existingProfile = await ModelProfile.findOne({ userId: user._id });

      // Prepare update object with all new fields
      const updateData: any = {};

      // Portfolio fields
      if (body.name !== undefined) updateData.name = body.name;
      if (body.displayName !== undefined) updateData.displayName = body.displayName;
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.primaryPhoto !== undefined) updateData.primaryPhoto = body.primaryPhoto;
      if (body.referencePhotos !== undefined) updateData.referencePhotos = body.referencePhotos;
      if (body.specialties !== undefined) updateData.specialties = body.specialties;
      if (body.pricePerAccess !== undefined) updateData.pricePerAccess = body.pricePerAccess;
      if (body.currency !== undefined) updateData.currency = body.currency;
      if (body.requiresConsent !== undefined) updateData.requiresConsent = body.requiresConsent;
      if (body.consentSigned !== undefined) updateData.consentSigned = body.consentSigned;
      if (body.consentSignedAt !== undefined) updateData.consentSignedAt = body.consentSignedAt;

      // Personal information fields
      if (body.phoneNumber !== undefined) {
        updateData.phoneNumber = body.phoneNumber && body.phoneNumber.trim() ? body.phoneNumber.trim() : undefined;
      }
      if (body.paymentMethods !== undefined) updateData.paymentMethods = body.paymentMethods;
      if (body.activeness !== undefined) updateData.activeness = body.activeness;

      // Status and visibility
      if (body.status !== undefined) updateData.status = body.status;
      if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;

      // Backward compatibility: sync old fields
      if (body.referenceImages !== undefined) {
        updateData.referenceImages = body.referenceImages;
      }
      if (body.price !== undefined) {
        updateData.price = body.price;
        // Also update pricePerAccess if not provided
        if (body.pricePerAccess === undefined) {
          updateData.pricePerAccess = body.price;
        }
      }
      if (body.consentRequired !== undefined) {
        updateData.consentRequired = body.consentRequired;
        // Also update requiresConsent if not provided
        if (body.requiresConsent === undefined) {
          updateData.requiresConsent = body.consentRequired;
        }
      }

      // If creating new profile, ensure required fields are set
      if (!existingProfile) {
        // Name is required - must be provided
        if (!body.name || !body.name.trim()) {
          return NextResponse.json(
            {
              status: "error",
              message: "Name is required when creating a new profile",
              code: "VALIDATION_ERROR",
            },
            { status: 400 }
          );
        }
        // Set required fields for new profile
        updateData.userId = user._id;
        updateData.name = body.name.trim();
        // Set default status for new profiles if not provided
        if (body.status === undefined) {
          updateData.status = "draft";
        }
      }

      // Find and update model profile (or create if doesn't exist)
      let modelProfile;
      if (!existingProfile) {
        // Create new profile with all required fields
        modelProfile = await ModelProfile.create({
          userId: user._id,
          name: updateData.name,
          ...updateData,
        });
      } else {
        // Update existing profile
        modelProfile = await ModelProfile.findOneAndUpdate(
          { userId: user._id },
          updateData,
          { new: true, runValidators: true }
        );
      }

      // Populate and return
      const populatedProfile = await ModelProfile.findById(modelProfile._id)
        .populate("userId", "firstName lastName picture emailAddress")
        .lean();

      return NextResponse.json(
        {
          status: "success",
          message: "Model profile updated successfully",
          data: populatedProfile,
        },
        { status: 200 }
      );
    } catch (err: any) {
      console.error("Error updating model profile:", err);
      return NextResponse.json(
        {
          status: "error",
          message: err.message || "Failed to update model profile",
          code: "UPDATE_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

