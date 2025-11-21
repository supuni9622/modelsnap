import { connectDB } from "@/lib/db";
import Generation from "@/models/generation";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/admin/analytics/generations
 * Admin endpoint to get generation analytics
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build date query
    const dateQuery: any = {};
    if (startDate || endDate) {
      dateQuery.generatedAt = {};
      if (startDate) {
        dateQuery.generatedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateQuery.generatedAt.$lte = new Date(endDate);
      }
    }

    // Get all generations
    const allGenerations = await Generation.find(dateQuery).lean();

    // Calculate statistics
    const totalGenerations = allGenerations.length;
    const aiGenerations = allGenerations.filter((g) => g.modelType === "AI_AVATAR").length;
    const humanGenerations = allGenerations.filter((g) => g.modelType === "HUMAN_MODEL").length;

    const completed = allGenerations.filter((g) => g.status === "completed").length;
    const failed = allGenerations.filter((g) => g.status === "failed").length;
    const processing = allGenerations.filter((g) => g.status === "processing").length;
    const pending = allGenerations.filter((g) => g.status === "pending").length;

    const successRate = totalGenerations > 0 ? (completed / totalGenerations) * 100 : 0;

    // Calculate revenue
    const totalCreditsUsed = allGenerations.reduce((sum, g) => sum + (g.creditsUsed || 0), 0);
    const totalRoyaltiesPaid = allGenerations.reduce((sum, g) => sum + (g.royaltyPaid || 0), 0);

    // Get generations by date (for charts)
    const generationsByDate = allGenerations.reduce((acc: Record<string, number>, gen) => {
      const date = new Date(gen.generatedAt).toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Get generations by status
    const generationsByStatus = {
      completed,
      failed,
      processing,
      pending,
    };

    // Get generations by type
    const generationsByType = {
      ai: aiGenerations,
      human: humanGenerations,
    };

    return NextResponse.json(
      {
        status: "success",
        data: {
          summary: {
            totalGenerations,
            aiGenerations,
            humanGenerations,
            successRate: Math.round(successRate * 100) / 100,
            totalCreditsUsed,
            totalRoyaltiesPaid,
          },
          statusBreakdown: generationsByStatus,
          typeBreakdown: generationsByType,
          dailyGenerations: Object.entries(generationsByDate)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching generation analytics:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch generation analytics",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

