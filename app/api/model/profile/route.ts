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

