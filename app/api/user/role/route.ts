import { connectDB } from "@/lib/db";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * POST /api/user/role
 * Update user's role (BUSINESS or MODEL)
 * Requires authentication
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
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

    // Parse request body
    const body = await req.json();
    const { role } = body;

    // Validate role
    if (!role || !["BUSINESS", "MODEL", "ADMIN"].includes(role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid role. Must be BUSINESS, MODEL, or ADMIN",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Prevent users from setting ADMIN role (only admins can do this)
    if (role === "ADMIN") {
      const user = await User.findOne({ id: userId });
      if (!user || user.role !== "ADMIN") {
        return NextResponse.json(
          {
            status: "error",
            message: "Only admins can set ADMIN role",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }
    }

    // Update user role
    const updatedUser = await User.findOneAndUpdate(
      { id: userId },
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        {
          status: "error",
          message: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Create profile document based on role (as per UI_FLOW.md requirements)
    if (role === "BUSINESS") {
      // Check if business profile already exists
      const existingBusinessProfile = await BusinessProfile.findOne({ userId: updatedUser._id });
      if (!existingBusinessProfile) {
        // Create business profile automatically with all new fields
        const currentDate = new Date();
        await BusinessProfile.create({
          userId: updatedUser._id,
          businessName: `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim() || "My Business",
          description: "",
          aiCredits: updatedUser.credits || 0, // Legacy field
          subscriptionTier: "free",
          aiCreditsRemaining: 3,
          aiCreditsTotal: 3,
          subscriptionStatus: "active",
          lastCreditReset: currentDate,
          creditResetDay: currentDate.getDate(),
          approvedModels: [],
        });
        console.log("✅ Business profile created automatically for user:", userId);
      }
    } else if (role === "MODEL") {
      // Check if model profile already exists
      const existingModelProfile = await ModelProfile.findOne({ userId: updatedUser._id });
      if (!existingModelProfile) {
        // Note: Model profile requires reference images, so we create a placeholder
        // The user will need to complete their profile with images
        // But we create the document as per requirements
        await ModelProfile.create({
          userId: updatedUser._id,
          name: `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim() || "Model",
          referenceImages: [], // User will add these later
          consentSigned: false,
          status: "active",
          royaltyBalance: 0,
          approvedBusinesses: [],
        });
        console.log("✅ Model profile created automatically for user:", userId);
      }
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Role updated successfully",
        data: {
          role: updatedUser.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update role",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/user/role
 * Get current user's role
 * Requires authentication
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
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

    // Get user
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

    // Check if admin via ADMIN_EMAILS (even if not in DB)
    const clerkUser = await (await import("@clerk/nextjs/server")).currentUser();
    if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
      if (adminEmails.includes(clerkUser.emailAddresses[0].emailAddress)) {
        return NextResponse.json(
          {
            status: "success",
            data: {
              role: "ADMIN",
            },
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        status: "success",
        data: {
          role: user.role || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting user role:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to get role",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

