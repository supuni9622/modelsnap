import { connectDB } from "@/lib/db";
import ConsentRequest from "@/models/consent-request";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/admin/consent
 * Admin endpoint to list all consent requests with filtering
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
    const businessId = searchParams.get("businessId");
    const modelId = searchParams.get("modelId");

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (businessId) {
      query.businessId = businessId;
    }
    if (modelId) {
      query.modelId = modelId;
    }

    // Get consent requests with pagination
    const skip = (page - 1) * limit;
    const requests = await ConsentRequest.find(query)
      .populate({
        path: "businessId",
        select: "businessName userId",
        populate: {
          path: "userId",
          select: "id firstName lastName emailAddress",
        },
      })
      .populate({
        path: "modelId",
        select: "name userId",
        populate: {
          path: "userId",
          select: "id firstName lastName emailAddress",
        },
      })
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ConsentRequest.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        status: "success",
        data: {
          requests,
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
    console.error("Error fetching consent requests:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch consent requests",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

