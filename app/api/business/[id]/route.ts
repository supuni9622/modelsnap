import { connectDB } from "@/lib/db";
import BusinessProfile from "@/models/business-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/business/[id]
 * Get a specific business profile by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    const { id } = await params;
    try {
      await connectDB();

      const businessProfile = await BusinessProfile.findById(id)
        .populate("userId", "firstName lastName emailAddress picture")
        .lean()
        .exec();

      if (!businessProfile) {
        return NextResponse.json(
          {
            status: "error",
            message: "Business profile not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Type assertion
      const businessDoc = businessProfile as any;

      return NextResponse.json(
        {
          status: "success",
          data: businessDoc,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("Error fetching business profile:", err);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to fetch business profile",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

