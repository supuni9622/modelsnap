import { connectDB } from "@/lib/db";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
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
 * GET /api/admin/users
 * List all users with pagination
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
    const search = searchParams.get("search");

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { id: search },
        { emailAddress: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    // For business users, fetch BusinessProfile to get actual credits
    const businessUserIds = users
      .filter((u: any) => u.role === "BUSINESS")
      .map((u: any) => u._id);

    const businessProfiles = businessUserIds.length > 0
      ? await BusinessProfile.find({ userId: { $in: businessUserIds } }).lean()
      : [];

    // Create a map of userId -> BusinessProfile for quick lookup
    const businessProfileMap = new Map(
      businessProfiles.map((bp: any) => [bp.userId.toString(), bp])
    );

    // Enrich users with BusinessProfile credits for business users
    const enrichedUsers = users.map((user: any) => {
      if (user.role === "BUSINESS") {
        const businessProfile = businessProfileMap.get(user._id.toString());
        return {
          ...user,
          credits: businessProfile?.aiCreditsRemaining ?? user.credits ?? 0,
          // Include additional business profile info for reference
          businessProfile: businessProfile
            ? {
                subscriptionTier: businessProfile.subscriptionTier,
                aiCreditsTotal: businessProfile.aiCreditsTotal,
                subscriptionStatus: businessProfile.subscriptionStatus,
              }
            : null,
        };
      }
      return user;
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        status: "success",
        data: {
          users: enrichedUsers,
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
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch users",
        code: "FETCH_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/users
 * Update user (credits, plan, etc.)
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
    const { userId, credits, plan } = body;

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
      credits?: number;
      plan?: {
        id?: string;
        type?: string;
        name?: string;
        price?: string;
        isPremium?: boolean;
      };
    } = {};

    if (credits !== undefined) {
      updateData.credits = credits;
    }

    if (plan) {
      updateData.plan = plan;
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
        message: "User updated successfully",
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update user",
        code: "UPDATE_ERROR",
      },
      { status: 500 }
    );
  }
});

