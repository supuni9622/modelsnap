import { connectDB } from "@/lib/db";
import PayoutRequest from "@/models/payout-request";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { processPayoutRequest } from "@/lib/payout-utils";

/**
 * GET /api/admin/payouts
 * Get all pending payout requests (admin only)
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

    // Check if user is admin
    const user = await User.findOne({ id: userId });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          status: "error",
          message: "Admin access required",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // Get all pending payout requests from separate collection
    const pendingPayouts = await PayoutRequest.find({
      status: { $in: ["pending", "under_review", "approved"] },
    })
      .populate("modelId", "name")
      .populate("userId", "firstName lastName emailAddress")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        status: "success",
        data: {
          payouts: pendingPayouts.map((payout) => ({
            _id: payout._id,
            transactionReference: payout.transactionReference,
            modelId: payout.modelId,
            modelName: (payout.modelId as any)?.name,
            userId: payout.userId,
            amount: payout.amount / 100, // Convert from cents
            currency: payout.currency,
            paymentMethod: payout.paymentMethod,
            accountDetails: payout.accountDetails,
            status: payout.status,
            requestedAt: payout.createdAt,
            statusHistory: payout.statusHistory,
          })),
          total: pendingPayouts.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch payout requests",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/payouts
 * Process a payout request (approve/reject)
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
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

    // Check if user is admin
    const user = await User.findOne({ id: userId });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          status: "error",
          message: "Admin access required",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { payoutId, action, transactionId, notes, failureReason } = body;

    if (!payoutId || !action) {
      return NextResponse.json(
        {
          status: "error",
          message: "payoutId and action are required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Validate action
    if (!["approve", "reject", "complete", "fail"].includes(action)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid action. Must be 'approve', 'reject', 'complete', or 'fail'",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Process payout using utility function
    const result = await processPayoutRequest(
      payoutId,
      action as "approve" | "reject" | "complete" | "fail",
      userId,
      transactionId,
      notes,
      failureReason
    );

    if (!result.success) {
      return NextResponse.json(
        {
          status: "error",
          message: result.error || "Failed to process payout",
          code: "PROCESSING_FAILED",
        },
        { status: 400 }
      );
    }

    // Get updated payout request
    const payoutRequest = await PayoutRequest.findById(payoutId).lean();

    return NextResponse.json(
      {
        status: "success",
        message: `Payout request ${action}d successfully`,
        data: {
          payoutRequest: payoutRequest
            ? {
                _id: payoutRequest._id,
                transactionReference: payoutRequest.transactionReference,
                status: payoutRequest.status,
                amount: payoutRequest.amount / 100,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing payout:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to process payout",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

