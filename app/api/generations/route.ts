import { connectDB } from "@/lib/db";
import Render from "@/models/render";
import Generation from "@/models/generation";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/generations
 * Fetch all generations (AI + Human) for the authenticated business user
 * 
 * Query parameters:
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 50)
 * - modelType: filter by type (AI_AVATAR, HUMAN_MODEL)
 * - status: filter by status (pending, processing, completed, failed)
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const modelType = searchParams.get("modelType");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build query for Render (AI avatars)
    const renderQuery: any = { userId };
    if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
      renderQuery.status = status;
    }

    // Build query for Generation (Human models)
    let generationQuery: any = { userId: user._id };
    if (modelType === "AI_AVATAR") {
      // Skip human models - use empty array
      generationQuery = null;
    } else if (modelType === "HUMAN_MODEL") {
      // Only human models - query stays as is
    }
    if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
      generationQuery.status = status;
    }

    // Fetch both types
    const [renders, generations, renderCount, generationCount] = await Promise.all([
      modelType !== "HUMAN_MODEL"
        ? Render.find(renderQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
        : [],
      modelType !== "AI_AVATAR" && generationQuery
        ? Generation.find(generationQuery)
            .populate("modelId", "name referenceImages")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
        : [],
      modelType !== "HUMAN_MODEL" ? Render.countDocuments(renderQuery) : 0,
      modelType !== "AI_AVATAR" && generationQuery
        ? Generation.countDocuments(generationQuery)
        : 0,
    ]);

    // Combine and format results
    const allGenerations = [
      ...renders.map((r: any) => ({
        _id: r._id.toString(),
        type: "AI_AVATAR" as const,
        garmentImageUrl: r.garmentImageUrl,
        outputS3Url: r.outputS3Url || r.outputUrl,
        status: r.status,
        creditsUsed: r.creditsUsed || 1,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      ...generations.map((g: any) => ({
        _id: g._id.toString(),
        type: "HUMAN_MODEL" as const,
        garmentImageUrl: g.garmentImageUrl,
        outputS3Url: g.outputS3Url,
        status: g.status,
        royaltyPaid: g.royaltyPaid || 0,
        modelId: g.modelId?._id?.toString(),
        modelName: g.modelId?.name,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = renderCount + generationCount;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        status: "success",
        data: {
          generations: allGenerations.slice(0, limit),
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
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch generations",
        code: "FETCH_ERROR",
      },
      { status: 500 }
    );
  }
});

