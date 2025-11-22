import { connectDB } from "@/lib/db";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/models
 * List all active model profiles (for marketplace browsing)
 * Public endpoint - no authentication required for browsing
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active";
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Build query
    const query: any = { status };
    
    // Show all active models in marketplace
    // Businesses can request consent from any model they see
    // The consentSigned field is for general consent agreement, not marketplace visibility

    // Fetch models with pagination
    const models = await ModelProfile.find(query)
      .populate("userId", "firstName lastName picture emailAddress")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count
    const total = await ModelProfile.countDocuments(query);

    return NextResponse.json(
      {
        status: "success",
        data: {
          models,
          pagination: {
            total,
            limit,
            skip,
            hasMore: skip + limit < total,
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching models:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch models",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/models
 * Create a new model profile
 * Requires authentication and MODEL role
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

    // Check if user already has a model profile
    const existingProfile = await ModelProfile.findOne({ userId: user._id });
    if (existingProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model profile already exists",
          code: "PROFILE_EXISTS",
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, referenceImages, consentSigned } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        {
          status: "error",
          message: "Name is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!referenceImages || !Array.isArray(referenceImages) || referenceImages.length < 3) {
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

    // Create model profile
    const modelProfile = await ModelProfile.create({
      userId: user._id,
      name,
      referenceImages,
      consentSigned: consentSigned || false,
      status: "active",
      royaltyBalance: 0,
      approvedBusinesses: [],
    });

    // Update user role to MODEL if not already set
    if (user.role !== "MODEL") {
      await User.findOneAndUpdate({ id: userId }, { role: "MODEL" });
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Model profile created successfully",
        data: modelProfile,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating model profile:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create model profile",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

