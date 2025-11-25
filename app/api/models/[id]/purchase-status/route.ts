import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import ModelPurchase from "@/models/model-purchase";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "model-purchase-status" });

/**
 * GET /api/models/[id]/purchase-status
 * Check if the current business has purchased a specific model
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    try {
      await connectDB();

      const { id: modelId } = await params;

      // Verify authentication
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

      // Get user and business profile
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

      const businessProfile = await BusinessProfile.findOne({ userId: user._id });
      if (!businessProfile) {
        return NextResponse.json(
          {
            status: "error",
            message: "Business profile not found",
            code: "BUSINESS_PROFILE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Check if model is in purchasedModels array (fast check)
      const isPurchased = businessProfile.purchasedModels.some(
        (id: any) => id.toString() === modelId
      );

      // Get purchase record if exists
      const purchase = await ModelPurchase.findOne({
        businessId: businessProfile._id,
        modelId,
        status: "completed",
      })
        .populate("modelId", "name price")
        .lean();

      return NextResponse.json(
        {
          status: "success",
          data: {
            isPurchased,
            purchase: purchase
              ? {
                  id: (purchase as any)._id,
                  purchasedAt: (purchase as any).purchasedAt,
                  amount: (purchase as any).amount,
                  currency: (purchase as any).currency,
                }
              : null,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      logger.error("Error checking purchase status", error as Error);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to check purchase status",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

