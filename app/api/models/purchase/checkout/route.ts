import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteSettings, lemonSqueezyStoreId } from "@/lib/config/settings";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import ModelPurchase from "@/models/model-purchase";
import { checkConsentStatus } from "@/lib/consent-utils";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { createLogger } from "@/lib/utils/logger";
import {
  createCheckout,
  lemonSqueezySetup,
  createCustomer,
} from "@lemonsqueezy/lemonsqueezy.js";

const logger = createLogger({ component: "model-purchase-checkout" });

// Get public URL from site settings
let publicUrl = SiteSettings.domainUrl;
if (publicUrl.endsWith("/en")) {
  publicUrl = publicUrl.slice(0, -3);
}
const defaultLocale = "en";

/**
 * Creates or retrieves a Lemon Squeezy customer
 */
async function getOrCreateLemonSqueezyCustomer(
  userId: string,
  userEmail: string,
  userFirstName?: string,
  userLastName?: string
) {
  await connectDB();

  let user = await User.findOne({ id: userId });

  if (user?.lemonsqueezyCustomerId) {
    return user.lemonsqueezyCustomerId;
  }

  // Create new customer in Lemon Squeezy
  const storeId = lemonSqueezyStoreId;
  if (isNaN(storeId)) {
    throw new Error("Invalid store ID format");
  }

  const { data: customerData, error } = await createCustomer(storeId, {
    name:
      userFirstName && userLastName
        ? `${userFirstName} ${userLastName}`
        : userEmail,
    email: userEmail,
    city: null,
    region: null,
    country: null,
  });

  if (error) {
    throw new Error(`Failed to create Lemon Squeezy customer: ${error.message}`);
  }

  const customerId = customerData.data.id;

  // Save customer ID to database
  if (user) {
    await User.updateOne({ id: userId }, { lemonsqueezyCustomerId: customerId });
  } else {
    const clerkUser = await (await clerkClient()).users.getUser(userId);
    await User.create({
      id: userId,
      emailAddress: [userEmail],
      firstName: userFirstName || clerkUser.firstName,
      lastName: userLastName || clerkUser.lastName,
      lemonsqueezyCustomerId: customerId,
    });
  }

  return customerId;
}

/**
 * POST /api/models/purchase/checkout
 * Create a Lemon Squeezy checkout session for purchasing a human model
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    // Check if Lemon Squeezy is configured
    if (!process.env.LEMON_SQUEEZY_API_KEY || !process.env.LEMON_SQUEEZY_STORE_ID) {
      return NextResponse.json(
        {
          status: "error",
          message: "Lemon Squeezy is not configured",
          code: "LEMONSQUEEZY_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    // Setup Lemon Squeezy
    lemonSqueezySetup({
      apiKey: process.env.LEMON_SQUEEZY_API_KEY,
    });

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

    // Get user email and name
    let userEmail = user.emailAddress?.[0];
    let userFirstName = user.firstName;
    let userLastName = user.lastName;

    if (!userEmail || !userFirstName || !userLastName) {
      const clerkUser = await (await clerkClient()).users.getUser(userId);
      userEmail = userEmail || clerkUser.emailAddresses[0]?.emailAddress;
      userFirstName = userFirstName || clerkUser.firstName;
      userLastName = userLastName || clerkUser.lastName;
    }

    if (!userEmail) {
      return NextResponse.json(
        {
          status: "error",
          message: "User email is required",
          code: "USER_EMAIL_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Ensure user has Lemon Squeezy customer ID
    const customerId = await getOrCreateLemonSqueezyCustomer(
      userId,
      userEmail,
      userFirstName,
      userLastName
    );

    // Get model purchase variant ID from environment or use a default
    // Note: You need to create a product/variant in Lemon Squeezy for model purchases
    // This variant should be configured to accept custom pricing or use a base price
    const modelPurchaseVariantId = process.env.LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID;
    
    if (!modelPurchaseVariantId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model purchase variant ID is not configured. Please set LEMON_SQUEEZY_MODEL_PURCHASE_VARIANT_ID environment variable.",
          code: "VARIANT_ID_NOT_CONFIGURED",
        },
        { status: 500 }
      );
    }

    const parsedVariantId = parseInt(modelPurchaseVariantId);
    if (isNaN(parsedVariantId)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid model purchase variant ID format",
          code: "INVALID_VARIANT_ID",
        },
        { status: 500 }
      );
    }

    // Create Lemon Squeezy checkout session
    const storeId = lemonSqueezyStoreId;
    if (isNaN(storeId)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid store ID format",
          code: "INVALID_STORE_ID",
        },
        { status: 500 }
      );
    }

    const { data: checkoutData, error: checkoutError } = await createCheckout(
      storeId,
      parsedVariantId,
      {
        checkoutData: {
          custom: {
            type: "model_purchase",
            userId: userId,
            userEmail: userEmail,
            modelId: modelId.toString(),
            businessId: businessProfile._id.toString(),
            amount: amountInCents.toString(),
            platformCommission: platformCommission.toString(),
            modelEarnings: modelEarnings.toString(),
            modelName: modelProfile.name,
            customerId: customerId.toString(),
          },
          email: userEmail,
          name: userFirstName && userLastName ? `${userFirstName} ${userLastName}` : undefined,
        },
        productOptions: {
          redirectUrl: `${publicUrl}/${defaultLocale}/dashboard/business/models?purchase=success&modelId=${modelId}`,
          name: `Purchase Access: ${modelProfile.name}`,
          description: `One-time purchase for access to ${modelProfile.name} model`,
        },
        customPrice: amountInCents, // Set custom price for the model purchase
      }
    );

    if (checkoutError) {
      logger.error("Lemon Squeezy checkout error", checkoutError as Error);
      return NextResponse.json(
        {
          status: "error",
          message: `Failed to create checkout: ${checkoutError.message}`,
          code: "CHECKOUT_ERROR",
        },
        { status: 500 }
      );
    }

    const checkoutId = checkoutData.data.id;
    const checkoutUrl = checkoutData.data.attributes.url;

    // Create pending purchase record
    const purchase = await ModelPurchase.create({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      lemonsqueezyCheckoutId: checkoutId,
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
      checkoutId: checkoutId,
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Checkout session created",
        data: {
          checkoutUrl: checkoutUrl,
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

