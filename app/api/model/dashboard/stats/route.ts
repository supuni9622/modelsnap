import { connectDB } from "@/lib/db";
import Generation from "@/models/generation";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/model/dashboard/stats
 * Get model dashboard statistics
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

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all completed generations for this model
    const allGenerations = await Generation.find({
      modelId: modelProfile._id,
      status: "completed",
    }).lean();

    // Calculate stats
    const totalEarnings = allGenerations.reduce(
      (sum, gen) => sum + (gen.royaltyPaid || 0),
      0
    );

    const thisMonthGenerations = allGenerations.filter(
      (gen) => new Date(gen.generatedAt) >= monthStart
    );

    const thisMonthEarnings = thisMonthGenerations.reduce(
      (sum, gen) => sum + (gen.royaltyPaid || 0),
      0
    );

    const totalGenerations = allGenerations.length;

    // Pending earnings = current balance (will be paid out)
    const pendingEarnings = modelProfile.royaltyBalance || 0;

    return NextResponse.json(
      {
        status: "success",
        data: {
          totalEarnings,
          thisMonthEarnings,
          totalGenerations,
          pendingEarnings,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching model stats:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch model stats",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

