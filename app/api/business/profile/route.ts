import { connectDB } from "@/lib/db";
import BusinessProfile from "@/models/business-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/business/profile
 * Get business profile for authenticated user
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

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

    const businessProfile = await BusinessProfile.findOne({ userId: user._id }).lean();

    if (!businessProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Business profile not found",
          code: "PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        data: businessProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching business profile:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch business profile",
        code: "FETCH_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/business/profile
 * Create business profile
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

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
    const { businessName, description } = body;

    if (!businessName) {
      return NextResponse.json(
        {
          status: "error",
          message: "Business name is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const existing = await BusinessProfile.findOne({ userId: user._id });
    if (existing) {
      return NextResponse.json(
        {
          status: "error",
          message: "Business profile already exists. Use PUT to update.",
          code: "PROFILE_EXISTS",
        },
        { status: 400 }
      );
    }

    // Initialize all new fields with proper defaults for free tier
    const currentDate = new Date();
    const businessProfile = await BusinessProfile.create({
      userId: user._id,
      businessName,
      description: description || "",
      aiCredits: user.credits || 0, // Legacy field for backward compatibility
      subscriptionTier: "free",
      aiCreditsRemaining: 3,
      aiCreditsTotal: 3,
      subscriptionStatus: "active",
      lastCreditReset: currentDate,
      creditResetDay: currentDate.getDate(),
      approvedModels: [],
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Business profile created",
        data: businessProfile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating business profile:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create business profile",
        code: "CREATE_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/business/profile
 * Update business profile
 */
export const PUT = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

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
    const { businessName, description } = body;

    const businessProfile = await BusinessProfile.findOneAndUpdate(
      { userId: user._id },
      {
        ...(businessName && { businessName }),
        ...(description !== undefined && { description }),
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(
      {
        status: "success",
        message: "Business profile updated",
        data: businessProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating business profile:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update business profile",
        code: "UPDATE_ERROR",
      },
      { status: 500 }
    );
  }
});

