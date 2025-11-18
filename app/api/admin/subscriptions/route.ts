import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * Check if user is admin
 */
async function isAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) return false;

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
    return adminEmails.includes(user.emailAddresses[0].emailAddress);
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/subscriptions
 * List all subscriptions
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    // Check admin access
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          status: "error",
          message: "Unauthorized - Admin access required",
          code: "UNAUTHORIZED",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Get users with non-free plans
    const query = {
      "plan.type": { $ne: "free" },
    };

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        status: "success",
        data: {
          subscriptions: users.map((user) => ({
            userId: user.id,
            email: user.emailAddress?.[0] || "N/A",
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            plan: user.plan,
            credits: user.credits || 0,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch subscriptions",
        code: "FETCH_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/subscriptions
 * Update subscription (for bank transfer approval)
 */
export const PATCH = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    // Check admin access
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          status: "error",
          message: "Unauthorized - Admin access required",
          code: "UNAUTHORIZED",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, plan, credits } = body;

    if (!userId) {
      return NextResponse.json(
        {
          status: "error",
          message: "userId is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const updateData: {
      plan?: {
        id?: string;
        type?: string;
        name?: string;
        price?: string;
        isPremium?: boolean;
      };
      credits?: number;
    } = {};

    if (plan) {
      updateData.plan = plan;
    }

    if (credits !== undefined) {
      updateData.credits = credits;
    }

    const user = await User.findOneAndUpdate({ id: userId }, updateData, { new: true });

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
        message: "Subscription updated successfully",
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update subscription",
        code: "UPDATE_ERROR",
      },
      { status: 500 }
    );
  }
});

