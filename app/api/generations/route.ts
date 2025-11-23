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
    // Note: Generation collection only contains HUMAN_MODEL types
    // AI avatars are stored in Render collection
    let generationQuery: any = null;
    if (modelType !== "AI_AVATAR") {
      // Include human models if not filtering for AI only
      generationQuery = { 
        userId: user._id,
        modelType: "HUMAN_MODEL" // Always filter to human models only
      };
      if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
        generationQuery.status = status;
      }
    }

    // Fetch both types
    // Note: We fetch more than needed from each collection, then combine and paginate
    // This ensures we get the correct results when combining from two collections
    const fetchLimit = limit * 2; // Fetch more to account for combining
    
    const [renders, generations, renderCount, generationCount] = await Promise.all([
      modelType !== "HUMAN_MODEL"
        ? Render.find(renderQuery)
            .sort({ createdAt: -1 })
            .limit(fetchLimit)
            .lean()
        : [],
      modelType !== "AI_AVATAR" && generationQuery
        ? Generation.find(generationQuery)
            .populate("modelId", "name referenceImages")
            .sort({ createdAt: -1 })
            .limit(fetchLimit)
            .lean()
        : [],
      modelType !== "HUMAN_MODEL" ? Render.countDocuments(renderQuery) : 0,
      modelType !== "AI_AVATAR" && generationQuery
        ? Generation.countDocuments(generationQuery)
        : 0,
    ]);

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Generations API Debug:", {
        renderCount: renders.length,
        generationCount: generations.length,
        generationQuery,
        modelType,
        userId: user._id.toString(),
        totalRenders: renderCount,
        totalGenerations: generationCount,
      });
    }

    // Combine and format results
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const allGenerations = [
      ...renders.map((r: any) => {
        const renderId = r._id.toString();
        const outputS3Url = r.outputS3Url || r.outputUrl;
        return {
          _id: renderId,
          type: "AI_AVATAR" as const,
          garmentImageUrl: r.garmentImageUrl,
          outputS3Url: outputS3Url, // Original non-watermarked S3 URL (for download)
          previewImageUrl: outputS3Url 
            ? `${baseUrl}/api/images/${renderId}/watermarked?type=ai`
            : undefined, // Watermarked preview URL
          status: r.status,
          creditsUsed: r.creditsUsed || 1,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
      ...generations.map((g: any) => {
        const generationId = g._id.toString();
        const outputS3Url = g.outputS3Url;
        return {
          _id: generationId,
          type: "HUMAN_MODEL" as const,
          garmentImageUrl: g.garmentImageUrl,
          outputS3Url: outputS3Url, // Original non-watermarked S3 URL (for download)
          previewImageUrl: outputS3Url
            ? `${baseUrl}/api/images/${generationId}/watermarked?type=human`
            : undefined, // Watermarked preview URL
          status: g.status,
          creditsUsed: g.creditsUsed || 0, // Human models may have creditsUsed: 0
          royaltyPaid: g.royaltyPaid || 0,
          modelId: g.modelId?._id?.toString(),
          modelName: g.modelId?.name,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = renderCount + generationCount;
    const totalPages = Math.ceil(total / limit);
    
    // Apply pagination to combined results (since we're combining from two collections)
    const paginatedGenerations = allGenerations.slice(skip, skip + limit);

    return NextResponse.json(
      {
        status: "success",
        data: {
          generations: paginatedGenerations,
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

