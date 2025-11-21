import { connectDB } from "@/lib/db";
import CreditTransaction from "@/models/credit-transaction";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/admin/credits/transactions
 * Admin endpoint to get credit transaction history
 * Requires ADMIN role
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.API)(async (req: NextRequest) => {
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

    // Get user and check admin role
    const user = await User.findOne({ id: userId });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          status: "error",
          message: "Forbidden - Admin access required",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const targetUserId = searchParams.get("userId");
    const type = searchParams.get("type");

    // Build query
    const query: any = {};
    if (targetUserId) {
      const targetUser = await User.findOne({ id: targetUserId });
      if (targetUser) {
        query.userId = targetUser._id;
      }
    }
    if (type) {
      query.type = type;
    }

    // Get transactions with pagination
    const skip = (page - 1) * limit;
    const transactions = await CreditTransaction.find(query)
      .populate("userId", "id firstName lastName emailAddress")
      .populate("adminUserId", "id firstName lastName emailAddress")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CreditTransaction.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        status: "success",
        data: {
          transactions,
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
    console.error("Error fetching credit transactions:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch credit transactions",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

