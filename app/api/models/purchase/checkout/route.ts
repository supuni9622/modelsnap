import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { SiteSettings } from "@/lib/config/settings";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import ModelPurchase from "@/models/model-purchase";
import { checkConsentStatus } from "@/lib/consent-utils";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "model-purchase-checkout" });
const publicUrl = SiteSettings.domainUrl;

/**
 * POST /api/models/purchase/checkout
 * Create a Stripe checkout session for purchasing a human model
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        {
          status: "error",
          message: "Stripe is not configured",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

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

    // Get request body
    const body = await req.json();
    const { modelId } = body;

    if (!modelId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model ID is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
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
          message: "Business profile not found. Please create a business profile first.",
          code: "BUSINESS_PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get model profile
    const modelProfile = await ModelProfile.findById(modelId);
    if (!modelProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model not found",
          code: "MODEL_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check if model is active
    if (modelProfile.status !== "active") {
      return NextResponse.json(
        {
          status: "error",
          message: "Model is not available for purchase",
          code: "MODEL_INACTIVE",
        },
        { status: 400 }
      );
    }

    // Check if model has a price set
    if (!modelProfile.price || modelProfile.price <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model purchase price is not set",
          code: "PRICE_NOT_SET",
        },
        { status: 400 }
      );
    }

    // Check if already purchased
    const existingPurchase = await ModelPurchase.findOne({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      status: { $in: ["pending", "completed"] },
    });

    if (existingPurchase) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model has already been purchased",
          code: "ALREADY_PURCHASED",
          data: {
            purchaseId: existingPurchase._id,
            status: existingPurchase.status,
          },
        },
        { status: 400 }
      );
    }

    // Check consent status if required
    if (modelProfile.consentRequired) {
      const consentStatus = await checkConsentStatus(userId, modelId);
      if (!consentStatus.hasConsent) {
        return NextResponse.json(
          {
            status: "error",
            message: consentStatus.message || "Consent is required before purchase",
            code: "CONSENT_REQUIRED",
            data: {
              consentStatus: consentStatus.consentRequest?.status || "NO_REQUEST",
            },
          },
          { status: 403 }
        );
      }
    }

    // Calculate commission (10% platform, 90% model)
    const amountInCents = modelProfile.price; // Price is already in cents
    const platformCommission = Math.round(amountInCents * 0.1);
    const modelEarnings = amountInCents - platformCommission;

    // Ensure user has Stripe customer ID
    if (!user.stripeCustomerId && stripe) {
      const customer = await stripe.customers.create({
        email: user.emailAddress,
        metadata: { userId },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to create Stripe customer",
          code: "STRIPE_CUSTOMER_ERROR",
        },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Purchase Access: ${modelProfile.name}`,
              description: `One-time purchase for access to ${modelProfile.name} model`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${publicUrl}/dashboard/business/models?purchase=success&modelId=${modelId}`,
      cancel_url: `${publicUrl}/dashboard/business/models?purchase=cancelled`,
      metadata: {
        type: "model_purchase",
        modelId: modelId.toString(),
        businessId: businessProfile._id.toString(),
        amount: amountInCents.toString(),
        platformCommission: platformCommission.toString(),
        modelEarnings: modelEarnings.toString(),
      },
    });

    // Create pending purchase record
    const purchase = await ModelPurchase.create({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      stripePaymentIntentId: checkoutSession.payment_intent as string || checkoutSession.id,
      stripeCheckoutSessionId: checkoutSession.id,
      amount: amountInCents,
      currency: "usd",
      platformCommission,
      modelEarnings,
      status: "pending",
    });

    logger.info("Model purchase checkout session created", {
      purchaseId: purchase._id,
      modelId,
      businessId: businessProfile._id,
      amount: amountInCents,
      checkoutSessionId: checkoutSession.id,
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Checkout session created",
        data: {
          checkoutUrl: checkoutSession.url,
          purchaseId: purchase._id,
          amount: amountInCents,
          currency: "usd",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error creating model purchase checkout", error as Error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create checkout session",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

