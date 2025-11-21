import { connectDB } from "@/lib/db";
import User from "@/models/user";
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

    return NextResponse.json(
      {
        status: "success",
        data: {
          role: user.role || "BUSINESS",
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

