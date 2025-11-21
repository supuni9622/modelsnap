import { connectDB } from "@/lib/db";
import User from "@/models/user";
import CreditTransaction from "@/models/credit-transaction";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { withTransaction } from "@/lib/transaction-utils";

/**
 * POST /api/admin/credits/adjust
 * Admin endpoint to adjust user credits
 * Requires ADMIN role
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.API)(async (req: NextRequest) => {
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

    // Parse request body
    const body = await req.json();
    const { targetUserId, amount, reason } = body;

    // Validation
    if (!targetUserId) {
      return NextResponse.json(
        {
          status: "error",
          message: "targetUserId is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        {
          status: "error",
          message: "amount is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        {
          status: "error",
          message: "reason is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await User.findOne({ id: targetUserId });
    if (!targetUser) {
      return NextResponse.json(
        {
          status: "error",
          message: "Target user not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Calculate new balance
    const currentBalance = targetUser.credits || 0;
    const newBalance = currentBalance + amount;

    // Prevent negative balances (unless explicitly allowed)
    if (newBalance < 0 && amount < 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Insufficient credits. Cannot deduct more than available.",
          code: "INSUFFICIENT_CREDITS",
        },
        { status: 400 }
      );
    }

    // Update credits and create transaction record atomically
    await withTransaction(async (session) => {
      // Update user credits
      await User.findByIdAndUpdate(
        targetUser._id,
        { $inc: { credits: amount } },
        { session }
      );

      // Create transaction record
      await CreditTransaction.create(
        [
          {
            userId: targetUser._id,
            type: "ADMIN_ADJUSTMENT",
            amount,
            balanceAfter: newBalance,
            reason: reason.trim(),
            adminUserId: adminUser._id,
            metadata: {
              adminName: `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim(),
              adminEmail: adminUser.emailAddress?.[0],
            },
          },
        ],
        { session }
      );
    });

    // Get updated user
    const updatedUser = await User.findOne({ id: targetUserId });

    return NextResponse.json(
      {
        status: "success",
        message: "Credits adjusted successfully",
        data: {
          userId: targetUser.id,
          previousBalance: currentBalance,
          adjustment: amount,
          newBalance: updatedUser?.credits || newBalance,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error adjusting credits:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to adjust credits",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

