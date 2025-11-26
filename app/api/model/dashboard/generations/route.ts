import { connectDB } from "@/lib/db";
import Generation from "@/models/generation";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/model/dashboard/generations
 * Get model's generation history
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

    const modelProfile = await ModelProfile.findOne({ userId: user._id });
    if (!modelProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model profile not found",
          code: "MODEL_PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Get generations for this model
    const generations = await Generation.find({
      modelId: modelProfile._id,
    })
      .populate("userId", "firstName lastName")
      .sort({ generatedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Generation.countDocuments({
      modelId: modelProfile._id,
    });

    return NextResponse.json(
      {
        status: "success",
        data: {
          generations,
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
  } catch (error) {
    console.error("Error fetching model generations:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch generations",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

