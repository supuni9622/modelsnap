// Import required dependencies
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import { connectDB } from "@/lib/db";
import { SiteSettings } from "@/lib/config/settings";
import { stripe } from "@/lib/stripe";

// Get public URL from site settings
// Note: domainUrl may already include /en in production, so we normalize it
let publicUrl = SiteSettings.domainUrl;
// Remove trailing /en if present to avoid double locale
if (publicUrl.endsWith("/en")) {
  publicUrl = publicUrl.slice(0, -3);
}

// Default locale for URLs (since Stripe doesn't know the user's locale)
const defaultLocale = "en";

/**
 * Creates a new user in MongoDB and Stripe if they don't already exist
 * @param userId - The Clerk user ID
 * @returns The user object from MongoDB
 */
async function createUserIfNotExists(userId: string) {
  await connectDB(); // Ensure DB is connected

  let user = await User.findOne({ id: userId });

  if (!user) {
    // Fetch user details from Clerk
    const clerkUser = await (await clerkClient()).users.getUser(userId);

    // Create Stripe customer with user's details if Stripe is configured
    let stripeCustomerId = null;
    if (stripe) {
      const customer = await stripe.customers.create({
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName} ${clerkUser.lastName}`,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    }

    // Save user in MongoDB with Stripe customer ID
    user = await User.create({
      id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      stripeCustomerId,
    });

    console.log("✅ New user created:", user);
  }

  return user;
}

/**
 * Handles POST requests for creating Stripe checkout sessions
 * @param req - The incoming request object containing priceId and checkout options
 * @returns Checkout session URL or error response
 */
export async function POST(req: Request) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
        },
        { status: 503 }
      );
    }

    // Extract checkout parameters from request body
    const { priceId, isSubscription, trial } = await req.json();
    console.log("Checkout request received:", { priceId, isSubscription });

    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      console.error("User not authenticated");
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Ensure user exists in our database
    const user = await createUserIfNotExists(userId);
    console.log("User found:", user);

    // Check if user has an existing subscription (for upgrades/downgrades)
    // This prevents creating duplicate subscriptions
    let existingSubscription: Stripe.Subscription | null = null;
    
    if (isSubscription && user.stripeCustomerId) {
      try {
        // First check BusinessProfile for subscription ID
        const businessProfile = await BusinessProfile.findOne({ userId: user._id });
        
        if (businessProfile?.stripeSubscriptionId) {
          try {
            // Verify subscription exists in Stripe and is active
            const subscription = await stripe.subscriptions.retrieve(
              businessProfile.stripeSubscriptionId
            );
            
            if (subscription.status !== "canceled" && subscription.status !== "unpaid" && subscription.status !== "incomplete_expired") {
              existingSubscription = subscription;
              console.log("✅ Found existing subscription from database:", existingSubscription.id, "Status:", subscription.status);
            }
          } catch (error) {
            console.log("Subscription not found in Stripe, checking all subscriptions");
          }
        }
        
        // If not found in database, check Stripe directly
        if (!existingSubscription) {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: "all",
            limit: 10,
          });
          
          // Find first active subscription
          const activeSub = subscriptions.data.find(
            (sub) => sub.status !== "canceled" && sub.status !== "unpaid" && sub.status !== "incomplete_expired"
          );
          
          if (activeSub) {
            existingSubscription = activeSub;
            console.log("✅ Found existing subscription from Stripe:", existingSubscription.id, "Status:", activeSub.status);
          }
        }
      } catch (error) {
        console.error("Error checking existing subscription:", error);
        // Continue with checkout creation if check fails
      }
    }

    // If user has existing subscription, update it instead of creating new one
    if (isSubscription && existingSubscription && !trial) {
      const currentPriceId = existingSubscription.items.data[0]?.price?.id;
      
      // Check if user is already on this plan
      if (currentPriceId === priceId) {
        console.log("User is already on this plan");
        return NextResponse.json(
          {
            url: `${publicUrl}/${defaultLocale}/dashboard/business/billing/success-payment?already_on_plan=true`,
            message: "You are already subscribed to this plan",
          },
          { status: 200 }
        );
      }

      console.log("Updating existing subscription from", currentPriceId, "to", priceId);
      
      try {
        // Update existing subscription to new plan
        const updatedSubscription = await stripe.subscriptions.update(
          existingSubscription.id,
          {
            items: [
              {
                id: existingSubscription.items.data[0].id,
                price: priceId,
              },
            ],
            proration_behavior: "always_invoice", // Create prorated invoice immediately
          }
        );

        console.log("✅ Subscription updated successfully:", updatedSubscription.id);
        
        // Check invoice to ensure it's not $0 for upgrades
        if (updatedSubscription.latest_invoice) {
          const invoice = await stripe.invoices.retrieve(
            updatedSubscription.latest_invoice as string
          );
          
          // Get prices to determine if upgrade or downgrade
          const currentPrice = await stripe.prices.retrieve(currentPriceId);
          const newPrice = await stripe.prices.retrieve(priceId);
          const isUpgrade = newPrice.unit_amount! > currentPrice.unit_amount!;
          
          console.log("Invoice details:", {
            id: invoice.id,
            amount_due: invoice.amount_due,
            total: invoice.total,
            isUpgrade,
          });
          
          if (isUpgrade && invoice.amount_due <= 0) {
            console.error("❌ ERROR: Upgrade invoice is $0! This should not happen.");
          }
        }
        
        // Return success URL - webhook will handle credit updates
        return NextResponse.json(
          {
            url: `${publicUrl}/${defaultLocale}/dashboard/business/billing/success-payment?subscription_updated=true`,
            subscriptionId: updatedSubscription.id,
          },
          { status: 200 }
        );
      } catch (updateError: any) {
        console.error("❌ Failed to update subscription:", updateError);
        // Fall through to create new checkout session if update fails
        console.log("Falling back to creating new checkout session");
      }
    }

    // Construct success and cancel URLs
    // Stripe will automatically replace {CHECKOUT_SESSION_ID} with the actual session ID
    const successUrl = `${publicUrl}/${defaultLocale}/dashboard/business/billing/success-payment?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${publicUrl}/${defaultLocale}/dashboard/business/billing/cancel-payment`;
    
    console.log("Creating checkout session with URLs:", {
      successUrl,
      cancelUrl,
      publicUrl,
      defaultLocale,
      hasExistingSubscription: !!existingSubscription,
    });

    let session;
    if (isSubscription) {
      // Handle subscription checkout
      if (trial) {
        // Create checkout session with trial period
        session = await stripe.checkout.sessions.create({
          customer: user.stripeCustomerId,
          line_items: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
          subscription_data: { trial_period_days: trial },
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
      } else {
        // Create regular subscription checkout session
        session = await stripe.checkout.sessions.create({
          customer: user.stripeCustomerId,
          line_items: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
      }
    } else {
      // Handle one-time payment checkout
      session = await stripe.checkout.sessions.create({
        customer: user.stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    }

    console.log("✅ Checkout session created:", {
      sessionId: session.id,
      url: session.url,
      successUrl: session.success_url,
      cancelUrl: session.cancel_url,
    });
    
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    const err = error as Error;
    console.error("❌ Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
