import { connectDB } from "@/lib/db";
import ConsentRequest from "@/models/consent-request";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { withTransaction } from "@/lib/transaction-utils";

/**
 * PUT /api/admin/consent/[id]
 * Admin endpoint to override consent request status
 * Requires ADMIN role
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.API)(async (req: NextRequest) => {
    const { id } = await params;
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
      const adminUser = await User.findOne({ id: userId });
      if (!adminUser || adminUser.role !== "ADMIN") {
        return NextResponse.json(
          {
            status: "error",
            message: "Forbidden - Admin access required",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Get consent request
      const consentRequest = await ConsentRequest.findById(id);
      if (!consentRequest) {
        return NextResponse.json(
          {
            status: "error",
            message: "Consent request not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Parse request body
      const body = await req.json();
      const { status, reason } = body;

      if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
        return NextResponse.json(
          {
            status: "error",
            message: "Invalid status. Must be APPROVED, REJECTED, or PENDING",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Update consent request and business profile atomically
      await withTransaction(async (session) => {
        const updateData: any = {
          status,
        };

        if (status === "APPROVED") {
          updateData.grantedAt = new Date();
        } else if (status === "REJECTED") {
          updateData.rejectedAt = new Date();
        }

        await ConsentRequest.findByIdAndUpdate(id, updateData, { session });

        // If approved, add model to business's approved models list
        if (status === "APPROVED") {
          await BusinessProfile.findByIdAndUpdate(
            consentRequest.businessId,
            {
              $addToSet: { approvedModels: consentRequest.modelId },
            },
            { session }
          );
        } else if (status === "REJECTED") {
          // Remove from approved models if rejected
          await BusinessProfile.findByIdAndUpdate(
            consentRequest.businessId,
            {
              $pull: { approvedModels: consentRequest.modelId },
            },
            { session }
          );
        }
      });

      // Get updated request
      const updatedRequest = await ConsentRequest.findById(id)
        .populate("businessId", "businessName")
        .populate("modelId", "name")
        .lean();

      return NextResponse.json(
        {
          status: "success",
          message: `Consent request ${status.toLowerCase()} successfully`,
          data: updatedRequest,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("Error updating consent request:", err);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to update consent request",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

