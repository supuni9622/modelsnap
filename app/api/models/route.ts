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
    const gender = searchParams.get("gender");
    const photoFraming = searchParams.get("photoFraming");
    const aspectRatio = searchParams.get("aspectRatio");
    const skinToneCategory = searchParams.get("skinToneCategory");
    const background = searchParams.get("background");

    const VALID_ASPECT_RATIOS = ["2:3", "1:1", "4:5", "16:9"];
    const VALID_FRAMING = ["full-body", "half-body", "three-quarter", "upper-body", "lower-body", "back-view"];
    const VALID_SKIN_TONE_CATEGORIES = ["light", "medium", "deep"];
    const VALID_BACKGROUND = ["indoor", "outdoor"];

    // Build query (gender, photoFraming, aspectRatio, skinToneCategory, background filter to new models that have these set)
    const query: any = { status };
    // Only show visible models in marketplace (treat missing as visible)
    query.isVisible = { $ne: false };
    if (gender && ["male", "female", "other"].includes(gender)) {
      query.gender = gender;
    }
    if (photoFraming && VALID_FRAMING.includes(photoFraming)) {
      query.photoFraming = photoFraming;
    }
    if (aspectRatio && VALID_ASPECT_RATIOS.includes(aspectRatio)) {
      query.aspectRatio = aspectRatio;
    }
    if (skinToneCategory && VALID_SKIN_TONE_CATEGORIES.includes(skinToneCategory)) {
      query.skinToneCategory = skinToneCategory;
    }
    if (background && VALID_BACKGROUND.includes(background)) {
      query.background = background;
    }
    
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
          models: (models || []).map((m: any) => ({
            ...m,
            visible: m?.isVisible ?? true,
          })),
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
    const { name, referenceImages, consentSigned, gender, photoFraming, aspectRatio, skinToneCategory, background, visible, isVisible } = body;

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

    // Create model profile (gender and photoFraming optional, for new models from today)
    const createPayload: Record<string, unknown> = {
      userId: user._id,
      name,
      referenceImages,
      consentSigned: consentSigned || false,
      status: "active",
      royaltyBalance: 0,
      approvedBusinesses: [],
    };
    const requestedVisible = visible ?? isVisible;
    if (typeof requestedVisible === "boolean") {
      (createPayload as any).isVisible = requestedVisible;
    }
    if (gender && ["male", "female", "other"].includes(gender)) {
      createPayload.gender = gender;
    }
    if (photoFraming && ["full-body", "half-body", "three-quarter", "upper-body", "lower-body", "back-view"].includes(photoFraming)) {
      createPayload.photoFraming = photoFraming;
    }
    if (aspectRatio && ["2:3", "1:1", "4:5", "16:9"].includes(aspectRatio)) {
      createPayload.aspectRatio = aspectRatio;
    }
    if (skinToneCategory && ["light", "medium", "deep"].includes(skinToneCategory)) {
      createPayload.skinToneCategory = skinToneCategory;
    }
    if (background && ["indoor", "outdoor"].includes(background)) {
      createPayload.background = background;
    }
    const modelProfile = await ModelProfile.create(createPayload);

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

