import { connectDB } from "@/lib/db";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/models/[id]
 * Get a specific model profile by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    const { id } = await params;
    try {
      await connectDB();

      const modelId = id;

      const model = await ModelProfile.findById(modelId)
        .populate("userId", "firstName lastName picture emailAddress")
        .populate("approvedBusinesses", "businessName")
        .lean()
        .exec();

      if (!model) {
        return NextResponse.json(
          {
            status: "error",
            message: "Model profile not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Type assertion - findById returns a single document, not an array
      const modelDoc = model as any;

      // Only show active models or if user is the owner/admin
      const { userId } = await auth();
      if (modelDoc.status !== "active" && userId) {
        const user = await User.findOne({ id: userId });
        const isOwner = user && modelDoc.userId?.toString() === user._id.toString();
        const isAdmin = user?.role === "ADMIN";

        if (!isOwner && !isAdmin) {
          return NextResponse.json(
            {
              status: "error",
              message: "Model profile not found",
              code: "NOT_FOUND",
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          status: "success",
          data: modelDoc,
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
  })(req);
}

/**
 * PUT /api/models/[id]
 * Update a model profile
 * Only the model owner or admin can update
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    const { id } = await params;
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

      const modelId = id;
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
      const modelProfile = await ModelProfile.findById(modelId);
      if (!modelProfile) {
        return NextResponse.json(
          {
            status: "error",
            message: "Model profile not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Check authorization (owner or admin)
      const isOwner = modelProfile.userId.toString() === user._id.toString();
      const isAdmin = user.role === "ADMIN";

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          {
            status: "error",
            message: "Forbidden - You can only update your own profile",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Parse request body
      const body = await req.json();
      const { name, referenceImages, status, consentSigned, phoneNumber, paymentMethods, activeness } = body;

      // Build update object
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      
      // Personal information fields
      if (phoneNumber !== undefined) {
        updateData.phoneNumber = phoneNumber && phoneNumber.trim() ? phoneNumber.trim() : undefined;
      }
      if (paymentMethods !== undefined) updateData.paymentMethods = paymentMethods;
      if (activeness !== undefined) updateData.activeness = activeness;
      
      // Allow owner to set status to paused or inactive, admin can set any status
      if (status !== undefined) {
        if (isAdmin) {
          updateData.status = status;
        } else if (isOwner) {
          // Owner can pause or deactivate their own profile
          if (status === "paused" || status === "inactive") {
            updateData.status = status;
          } else if (status === "active" && modelProfile.status !== "inactive") {
            // Owner can reactivate if not fully deactivated
            updateData.status = status;
          }
        }
      }
      if (consentSigned !== undefined) updateData.consentSigned = consentSigned;
      if (referenceImages !== undefined) {
        if (!Array.isArray(referenceImages) || referenceImages.length < 3) {
          return NextResponse.json(
            {
              status: "error",
              message: "At least 3 reference images are required",
              code: "VALIDATION_ERROR",
            },
            { status: 400 }
          );
        }
        if (referenceImages.length > 4) {
          return NextResponse.json(
            {
              status: "error",
              message: "Maximum 4 reference images allowed",
              code: "VALIDATION_ERROR",
            },
            { status: 400 }
          );
        }
        updateData.referenceImages = referenceImages;
      }

      // Update model profile
      const updatedModel = await ModelProfile.findByIdAndUpdate(
        modelId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("userId", "firstName lastName picture emailAddress")
        .lean();

      return NextResponse.json(
        {
          status: "success",
          message: "Model profile updated successfully",
          data: updatedModel,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("Error updating model profile:", err);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to update model profile",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}
