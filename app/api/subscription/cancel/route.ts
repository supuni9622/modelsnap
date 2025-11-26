import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { withTransactionAndExternal } from "@/lib/transaction-utils";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "subscription-cancel" });

/**
 * POST /api/subscription/cancel
 * Cancel user's subscription
 * Supports immediate cancellation or end-of-period cancellation
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

    // Check if user has an active subscription
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        {
          status: "error",
          message: "No active subscription found",
          code: "NO_SUBSCRIPTION",
        },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        {
          status: "error",
          message: "Payment service unavailable",
          code: "SERVICE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { cancelImmediately = false, reason } = body;

    // Get customer's active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "No active subscription found",
          code: "NO_SUBSCRIPTION",
        },
        { status: 400 }
      );
    }

    const subscription = subscriptions.data[0];

    // Cancel subscription
    let canceledSubscription: Stripe.Subscription;
    if (cancelImmediately) {
      // Cancel immediately - no refund by default (can be handled separately)
      canceledSubscription = await stripe.subscriptions.cancel(subscription.id);
      logger.info("Subscription canceled immediately", {
        userId: user.id,
        subscriptionId: subscription.id,
        reason
      });
    } else {
      // Cancel at end of billing period
      canceledSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
      logger.info("Subscription scheduled for cancellation at period end", {
        userId: user.id,
        subscriptionId: subscription.id,
        cancelAt: canceledSubscription.cancel_at,
        reason
      });
    }

    // Update user's plan to free tier when subscription actually ends
    // For immediate cancellation, update now; for end-of-period, it will be handled by webhook
    if (cancelImmediately) {
      await withTransactionAndExternal(
        // Database operations
        async (session) => {
          await User.updateOne(
            { id: userId },
            {
              $set: {
                "plan.id": null,
                "plan.type": "free",
                "plan.name": null,
                "plan.price": null,
                "plan.isPremium": false,
              },
            },
            { session }
          );

          return { user };
        },
        // External API operations
        async (dbResult) => {
          // Update Clerk user metadata
          await (
            await clerkClient()
          ).users.updateUser(dbResult.user.id, {
            privateMetadata: { plan: "free" },
            publicMetadata: { plan: "free" },
          });
        }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        message: cancelImmediately
          ? "Subscription canceled immediately"
          : "Subscription will be canceled at the end of the billing period",
        data: {
          subscriptionId: canceledSubscription.id,
          cancelAt: canceledSubscription.cancel_at
            ? new Date(canceledSubscription.cancel_at * 1000).toISOString()
            : null,
          canceledImmediately: cancelImmediately,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error canceling subscription", error as Error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to cancel subscription",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

