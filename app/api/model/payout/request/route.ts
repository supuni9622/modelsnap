import { connectDB } from "@/lib/db";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { createPayoutRequest } from "@/lib/payout-utils";

/**
 * POST /api/model/payout/request
 * Request a payout for model royalties
 * Requires authentication and MODEL role
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

    // Get user
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

    // Check if user is a model
    if (user.role !== "MODEL") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only models can request payouts",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // Get model profile
    const modelProfile = await ModelProfile.findOne({ userId: user._id });
    if (!modelProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model profile not found",
          code: "MODEL_PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { amount, paymentMethod, accountDetails } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid payout amount",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Check if model has enough balance
    if (modelProfile.royaltyBalance < amount) {
      return NextResponse.json(
        {
          status: "error",
          message: "Insufficient balance",
          code: "INSUFFICIENT_BALANCE",
          availableBalance: modelProfile.royaltyBalance,
        },
        { status: 400 }
      );
    }

    // Create payout request using utility function
    const result = await createPayoutRequest(
      userId,
      modelProfile._id.toString(),
      amount,
      paymentMethod || "bank_transfer",
      accountDetails || {}
    );

    if (!result.success) {
      return NextResponse.json(
        {
          status: "error",
          message: result.error || "Failed to create payout request",
          code: "PAYOUT_CREATION_FAILED",
        },
        { status: 400 }
      );
    }

    // Refresh model profile to get updated balance
    await modelProfile.populate("userId");
    const updatedProfile = await ModelProfile.findById(modelProfile._id);

    return NextResponse.json(
      {
        status: "success",
        message: "Payout request submitted successfully",
        data: {
          payoutRequest: {
            _id: result.payoutRequest._id,
            transactionReference: result.payoutRequest.transactionReference,
            amount: result.payoutRequest.amount / 100,
            status: result.payoutRequest.status,
            createdAt: result.payoutRequest.createdAt,
          },
          newBalance: updatedProfile?.royaltyBalance || 0,
          pendingPayouts: updatedProfile?.pendingPayouts || 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payout request:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create payout request",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/model/payout/request
 * Get payout request history for the model
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

    // Get user
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

    // Get model profile
    const modelProfile = await ModelProfile.findOne({ userId: user._id });
    if (!modelProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model profile not found",
          code: "MODEL_PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get payout requests from separate collection
    const PayoutRequest = (await import("@/models/payout-request")).default;
    const payoutRequests = await PayoutRequest.find({ modelId: modelProfile._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      {
        status: "success",
        data: {
          payoutRequests: payoutRequests.map((pr) => ({
            _id: pr._id,
            transactionReference: pr.transactionReference,
            amount: pr.amount / 100, // Convert from cents
            currency: pr.currency,
            paymentMethod: pr.paymentMethod,
            status: pr.status,
            createdAt: pr.createdAt,
            processedAt: pr.processedAt,
          })),
          royaltyBalance: modelProfile.royaltyBalance,
          pendingPayouts: modelProfile.pendingPayouts || 0,
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

