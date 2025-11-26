import { connectDB } from "@/lib/db";
import Render from "@/models/render";
import Generation from "@/models/generation";
import User from "@/models/user";
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

    // Get User document to access _id for Generation queries
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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query for Render (AI avatars)
    const renderQuery: any = { userId };
    if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
      renderQuery.status = status;
    }
    if (startDate || endDate) {
      renderQuery.createdAt = {};
      if (startDate) {
        renderQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        renderQuery.createdAt.$lte = new Date(endDate);
      }
    }

    // Build query for Generation (Human models)
    const generationQuery: any = {
      userId: user._id,
      modelType: "HUMAN_MODEL", // Only human models
    };
    if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
      generationQuery.status = status;
    }
    if (startDate || endDate) {
      generationQuery.createdAt = {};
      if (startDate) {
        generationQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        generationQuery.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const fetchLimit = limit * 2; // Fetch more to account for combining

    // Fetch both renders and generations
    const [renders, generations, renderCount, generationCount] = await Promise.all([
      Render.find(renderQuery)
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),
      Generation.find(generationQuery)
        .populate("modelId", "name referenceImages")
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),
      Render.countDocuments(renderQuery),
      Generation.countDocuments(generationQuery),
    ]);

    // Combine and format results
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const allRenders = [
      ...renders.map((r: any) => ({
        ...r,
        _id: r._id.toString(),
        type: "AI_AVATAR" as const,
        previewImageUrl: (r.outputS3Url || r.outputUrl || r.renderedImageUrl)
          ? `${baseUrl}/api/images/${r._id.toString()}/watermarked?type=ai`
          : undefined,
      })),
      ...generations.map((g: any) => ({
        _id: g._id.toString(),
        userId: g.userId.toString(),
        garmentImageUrl: g.garmentImageUrl,
        outputS3Url: g.outputS3Url,
        renderedImageUrl: g.outputS3Url,
        outputUrl: g.outputS3Url,
        status: g.status,
        creditsUsed: g.creditsUsed || 0,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        type: "HUMAN_MODEL" as const,
        modelId: g.modelId?._id?.toString(),
        modelName: g.modelId?.name,
        previewImageUrl: g.outputS3Url
          ? `${baseUrl}/api/images/${g._id.toString()}/watermarked?type=human`
          : undefined,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = renderCount + generationCount;
    const paginatedRenders = allRenders.slice(skip, skip + limit);

    // Debug logging
    console.log("Render history query:", {
      userId,
      renderQuery,
      generationQuery,
      renderCount: renders.length,
      generationCount: generations.length,
      total,
      paginatedCount: paginatedRenders.length,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json(
      {
        status: "success",
        data: {
          renders: paginatedRenders,
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

