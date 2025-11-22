import { connectDB } from "@/lib/db";
import Render from "@/models/render";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/render/history
 * Fetch user's render history with pagination and filtering
 * 
 * Query parameters:
 * - page: page number (default: 1)
 * - limit: items per page (default: 10, max: 50)
 * - status: filter by status (pending, processing, completed, failed)
 * - startDate: filter renders from this date (ISO string)
 * - endDate: filter renders until this date (ISO string)
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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    const query: {
      userId: string;
      status?: string;
      createdAt?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = {
      userId,
    };

    if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch renders
    const [renders, total] = await Promise.all([
      Render.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Render.countDocuments(query),
    ]);

    // Debug logging
    console.log("Render history query:", {
      userId,
      query,
      total,
      rendersCount: renders.length,
      sampleRender: renders[0] ? {
        _id: renders[0]._id,
        userId: renders[0].userId,
        status: renders[0].status,
        outputS3Url: renders[0].outputS3Url,
        renderedImageUrl: renders[0].renderedImageUrl,
      } : null,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json(
      {
        status: "success",
        data: {
          renders,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPrevPage,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching render history:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch render history",
        code: "FETCH_ERROR",
      },
      { status: 500 }
    );
  }
});

