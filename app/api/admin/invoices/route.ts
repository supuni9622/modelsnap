import { connectDB } from "@/lib/db";
import Invoice from "@/models/invoice";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/admin/invoices
 * Admin endpoint to list all invoices with filtering
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
    const status = searchParams.get("status");
    const userIdFilter = searchParams.get("userId");

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (userIdFilter) {
      const targetUser = await User.findOne({ id: userIdFilter });
      if (targetUser) {
        query.userId = targetUser._id;
      }
    }

    // Get invoices with pagination
    const skip = (page - 1) * limit;
    const invoices = await Invoice.find(query)
      .populate("userId", "id firstName lastName emailAddress")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Invoice.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        status: "success",
        data: {
          invoices,
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
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch invoices",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

