import { NextResponse } from "next/server";
import {
  createCheckout,
  lemonSqueezySetup,
  createCustomer,
  getSubscription,
  updateSubscription,
  listSubscriptions,
  listCustomers,
} from "@lemonsqueezy/lemonsqueezy.js";
import { auth, clerkClient } from "@clerk/nextjs/server";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import { connectDB } from "@/lib/db";
import { lemonSqueezyStoreId, SiteSettings } from "@/lib/config/settings";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { PricingPlans } from "@/lib/config/pricing";

// Get public URL from site settings
// Note: domainUrl may already include /en in production, so we normalize it
let publicUrl = process.env.NEXT_PUBLIC_APP_URL || SiteSettings.domainUrl;
// Remove trailing /en if present to avoid double locale
if (publicUrl.endsWith("/en")) {
  publicUrl = publicUrl.slice(0, -3);
}

// Default locale for URLs
const defaultLocale = "en";

/**
 * Creates a new user in MongoDB if they don't already exist
 * @param userId - The Clerk user ID
 * @returns The user object from MongoDB
 */
async function createUserIfNotExists(userId: string) {
  await connectDB();

  let user = await User.findOne({ id: userId });

  return user;
}

/**
 * Creates or retrieves a Lemon Squeezy customer
 * @param userId - The Clerk user ID
 * @param userEmail - The user's email
 * @param userFirstName - The user's first name
 * @param userLastName - The user's last name
 * @returns The Lemon Squeezy customer ID
 */
async function getOrCreateLemonSqueezyCustomer(
  userId: string,
  userEmail: string,
  userFirstName?: string,
  userLastName?: string
) {
  await connectDB();

  // Check if user already has a Lemon Squeezy customer ID
  let user = await User.findOne({ id: userId });

  if (user?.lemonsqueezyCustomerId) {
    console.log(
      "✅ User already has Lemon Squeezy customer ID:",
      user.lemonsqueezyCustomerId
    );
    return user.lemonsqueezyCustomerId;
  }

  // Check if customer already exists in Lemon Squeezy by email
  const storeId = lemonSqueezyStoreId;
  if (isNaN(storeId)) {
    throw new Error("Invalid store ID format");
  }

  console.log("🔍 Checking for existing Lemon Squeezy customer by email:", userEmail);

  // First, check if customer exists by email
  const { data: existingCustomers, error: listError } = await listCustomers({
    filter: {
      storeId: storeId,
      email: userEmail,
    },
  });

  if (!listError && existingCustomers?.data && existingCustomers.data.length > 0) {
    const existingCustomer = existingCustomers.data[0];
    const customerId = existingCustomer.id;
    console.log("✅ Found existing Lemon Squeezy customer:", customerId);

    // Save customer ID to database if not already saved
    if (user && !user.lemonsqueezyCustomerId) {
      await User.updateOne(
        { id: userId },
        { lemonsqueezyCustomerId: customerId }
      );
    }

    return customerId;
  }

  // Create new customer in Lemon Squeezy
  console.log("🔄 Creating new Lemon Squeezy customer for user:", userId);

  // Create customer with only required fields (name and email)
  // Don't pass optional fields as null - omit them entirely
  const { data: customerData, error } = await createCustomer(storeId, {
    name:
      userFirstName && userLastName
        ? `${userFirstName} ${userLastName}`
        : userEmail,
    email: userEmail,
  });

  if (error) {
    console.error("❌ Error creating Lemon Squeezy customer:", error);
    console.error("❌ Error details:", {
      message: error.message,
      cause: (error as any).cause,
      status: (error as any).status,
      storeId,
      customerEmail: userEmail,
      customerName: userFirstName && userLastName ? `${userFirstName} ${userLastName}` : userEmail,
    });
    throw new Error(
      `Failed to create Lemon Squeezy customer: ${error.message || "Internal Server Error"}`
    );
  }

  if (!customerData?.data) {
    console.error("❌ No customer data returned from Lemon Squeezy");
    throw new Error("Failed to create Lemon Squeezy customer: No data returned");
  }

  const customerId = customerData.data.id;
  console.log("✅ Lemon Squeezy customer created:", customerId);

  // Save customer ID to database
  if (user) {
    await User.updateOne(
      { id: userId },
      { lemonsqueezyCustomerId: customerId }
    );
  } else {
    // If user doesn't exist in our database, create them
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
 * Validates environment variables
 */
function validateEnvironment() {
  const requiredEnvVars = {
    LEMON_SQUEEZY_API_KEY: process.env.LEMON_SQUEEZY_API_KEY,
    LEMON_SQUEEZY_STORE_ID: process.env.LEMON_SQUEEZY_STORE_ID,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  // Validate API key format
  if (!process.env.LEMON_SQUEEZY_API_KEY?.startsWith("eyJ")) {
    throw new Error("Invalid API key format");
  }
}

/**
 * Validates request parameters
 */
function validateRequest(
  variantId: any,
  isSubscription: boolean,
  trial?: number
) {
  if (!variantId) {
    throw new Error("Variant ID is required");
  }

  const parsedVariantId = parseInt(variantId.toString());
  if (isNaN(parsedVariantId)) {
    throw new Error("Invalid variant ID format");
  }

  if (trial && (!isSubscription || trial <= 0)) {
    throw new Error(
      "Trial days can only be set for subscriptions and must be greater than 0"
    );
  }

  return parsedVariantId;
}

/**
 * Creates checkout options for Lemon Squeezy
 */
function createCheckoutOptions(
  userId: string,
  userEmail: string,
  isSubscription: boolean,
  userFirstName?: string,
  userLastName?: string,
  trial?: number,
  variantId?: number,
  customerId?: string
) {
  const checkoutOptions: any = {
    checkoutData: {
      custom: {
        userId: userId,
        userEmail: userEmail,
        priceId: variantId,
      },
      email: userEmail,
      name:
        userFirstName && userLastName
          ? `${userFirstName} ${userLastName}`
          : undefined,
      billing_address: {
        country: "US",
      },
    },
    customer: {
      email: userEmail,
      name:
        userFirstName && userLastName
          ? `${userFirstName} ${userLastName}`
          : undefined,
    },
  };

  if (customerId) {
    checkoutOptions.customerId = customerId;
  }

  if (isSubscription) {
    checkoutOptions.productOptions = {
      redirectUrl: `${publicUrl}/${defaultLocale}/dashboard/business/billing/success-payment`,
    };
    if (trial) {
      checkoutOptions.productOptions.trialDays = trial;
    }
  } else {
    // For one-time payments, only add redirectUrl at the root level
    checkoutOptions.redirectUrl = `${publicUrl}/${defaultLocale}/dashboard/business/billing/success-payment`;
    // Do NOT add productOptions or trialDays
  }

  return checkoutOptions;
}

export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PAYMENT)(async (req: Request) => {
  try {
    console.log("🚀 Starting Lemon Squeezy checkout creation");
    await connectDB();

    const { variantId, isSubscription, trial } = await req.json();
    console.log("📥 Received checkout request:", { variantId, isSubscription, trial });

    // Validate environment variables
    validateEnvironment();

    // Setup Lemon Squeezy
    const config = lemonSqueezySetup({
      apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
    });

    // Validate request parameters
    const parsedVariantId = validateRequest(variantId, isSubscription, trial);

    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Ensure user exists in our database
    const user = await createUserIfNotExists(userId);

    // Get user data from Clerk if not in our database
    let userEmail = user?.emailAddress?.[0];
    let userFirstName = user?.firstName;
    let userLastName = user?.lastName;

    if (!userEmail || !userFirstName || !userLastName) {
      const clerkUser = await (await clerkClient()).users.getUser(userId);
      userEmail = userEmail || clerkUser.emailAddresses[0]?.emailAddress;
      userFirstName = userFirstName || clerkUser.firstName;
      userLastName = userLastName || clerkUser.lastName;
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }

    // Create or get Lemon Squeezy customer
    const customerId = await getOrCreateLemonSqueezyCustomer(
      userId,
      userEmail,
      userFirstName,
      userLastName
    );

    // Check if user has an existing subscription (for upgrades/downgrades)
    // This prevents creating duplicate subscriptions - businesses can only have one subscription
    let existingSubscription: any = null;
    
    if (isSubscription && customerId) {
      try {
        // First check BusinessProfile for subscription ID
        const businessProfile = await BusinessProfile.findOne({ userId: user._id });
        
        if (businessProfile?.lemonsqueezySubscriptionId) {
          try {
            // Verify subscription exists in Lemon Squeezy and is active
            const { data: subscriptionData, error: subError } = await getSubscription(
              businessProfile.lemonsqueezySubscriptionId
            );
            
            if (!subError && subscriptionData) {
              const subscription = subscriptionData.data;
              const status = subscription.attributes.status;
              
              // Check if subscription is active (not cancelled, expired, or unpaid)
              if (status !== "cancelled" && status !== "expired" && status !== "unpaid") {
                existingSubscription = subscription;
                console.log("✅ Found existing subscription from database:", existingSubscription.id, "Status:", status);
              }
            }
          } catch (error) {
            console.log("Subscription not found in Lemon Squeezy, checking all subscriptions");
          }
        }
        
        // If not found in database, check Lemon Squeezy directly using userEmail filter
        // Note: Lemon Squeezy API doesn't support customerId filter, so we use userEmail
        if (!existingSubscription && userEmail) {
          const { data: subscriptionsData, error: listError } = await listSubscriptions({
            filter: { userEmail: userEmail },
            page: { number: 1, size: 10 },
          });
          
          if (!listError && subscriptionsData?.data) {
            // Find first active subscription that matches the customer ID
            const activeSub = subscriptionsData.data.find(
              (sub: any) => {
                const status = sub.attributes.status;
                const subCustomerId = sub.attributes.customer_id?.toString();
                return (
                  subCustomerId === customerId.toString() &&
                  status !== "cancelled" && 
                  status !== "expired" && 
                  status !== "unpaid"
                );
              }
            );
            
            if (activeSub) {
              existingSubscription = activeSub;
              console.log("✅ Found existing subscription from Lemon Squeezy:", existingSubscription.id, "Status:", activeSub.attributes.status);
            }
          }
        }
      } catch (error) {
        console.error("Error checking existing subscription:", error);
        // Continue with checkout creation if check fails
      }
    }

    // If user has existing subscription, check if they're already on this plan
    if (isSubscription && existingSubscription && !trial) {
      const currentVariantId = existingSubscription.attributes.first_subscription_item?.variant_id;
      
      // Check if user is already on this plan
      if (currentVariantId?.toString() === parsedVariantId.toString()) {
        console.log("User is already on this plan");
        return NextResponse.json(
          {
            url: `${publicUrl}/${defaultLocale}/dashboard/business/billing/success-payment?already_on_plan=true`,
            message: "You are already subscribed to this plan",
          },
          { status: 200 }
        );
      }

      // For upgrades/downgrades, create a checkout session so user can see the prorated amount
      // Lemon Squeezy will handle updating the existing subscription via webhook
      console.log("User has existing subscription, creating checkout for upgrade/downgrade");
      console.log("Current variant:", currentVariantId, "→ New variant:", parsedVariantId);
      // Continue to create checkout session below
    }

    // Debug logging
    console.log("🔍 Customer data for checkout:", {
      userId,
      userEmail,
      userFirstName,
      userLastName,
      customerId,
      isSubscription,
      trial,
      hasExistingSubscription: !!existingSubscription,
    });

    // Parse store ID
    const storeId = lemonSqueezyStoreId;
    if (isNaN(storeId)) {
      throw new Error("Invalid store ID format");
    }

    // Create checkout options
    const checkoutOptions = createCheckoutOptions(
      userId,
      userEmail,
      isSubscription,
      userFirstName,
      userLastName,
      trial,
      variantId,
      customerId
    );

    console.log(
      "🔍 Checkout options:",
      JSON.stringify(checkoutOptions, null, 2)
    );

    // Create checkout session
    console.log("🛒 Creating Lemon Squeezy checkout session...");
    const { data, error } = await createCheckout(
      storeId,
      parsedVariantId,
      checkoutOptions
    );

    if (error) {
      console.error("❌ Lemon Squeezy createCheckout error:", error);
      throw error;
    }

    if (!data?.data?.attributes?.url) {
      console.error("❌ No checkout URL returned from Lemon Squeezy");
      throw new Error("No checkout URL returned from Lemon Squeezy");
    }

    console.log("✅ Checkout session created successfully:", data.data.id);
    return NextResponse.json({
      url: data.data.attributes.url,
      checkoutId: data.data.id,
    });
  } catch (error: any) {
    console.error("Lemon Squeezy checkout error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to create checkout session",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
});
