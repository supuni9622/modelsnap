import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import ModelPurchase from "@/models/model-purchase";
import Invoice from "@/models/invoice";
import { Credits, PricingPlans } from "@/lib/config/pricing";
import crypto from "crypto";
import { createLemonSqueezyPaymentHistory } from "@/lib/payment-utils";
import { withTransaction } from "@/lib/transaction-utils";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { createLogger } from "@/lib/utils/logger";
import { getSubscription, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import {
  createOrUpdateInvoiceFromLemonSqueezySubscriptionInvoice,
  createOrUpdateInvoiceFromLemonSqueezyOrder,
} from "@/lib/invoice-utils";

const logger = createLogger({ component: "lemonsqueezy-webhook" });

/**
 * Verify Lemon Squeezy webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!;

  if (!secret || secret === "your_webhook_secret_here") {
    logger.error("Webhook secret not configured");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Helper function to find user by multiple identifiers
 * Priority: 1. Lemon Squeezy Customer ID (most reliable for existing subscriptions), 
 *           2. Clerk ID (for new subscriptions), 3. Email (least reliable)
 */
async function findUser(customerId?: string | number, userEmail?: string, userId?: string) {
  // Convert customerId to string for consistent comparison
  const customerIdStr = customerId ? String(customerId) : undefined;
  
  // PRIORITY 1: Try to find by Lemon Squeezy customer ID (most reliable for existing subscriptions)
  // This ensures we always find the correct user even if custom_data has stale Clerk IDs
  if (customerIdStr) {
    const user = await User.findOne({ lemonsqueezyCustomerId: customerIdStr });
    if (user) {
      console.log("✅ Found user by lemonsqueezyCustomerId (priority 1):", customerIdStr);
      // If custom_data user_id doesn't match, log a warning
      if (userId && user.id !== userId) {
        console.warn(`⚠️ custom_data user_id (${userId}) doesn't match found user (${user.id}). Using lemonsqueezyCustomerId match.`);
      }
      return user;
    }
  }
  
  // PRIORITY 2: Try to find by Clerk user ID (from custom_data) - for new users without customer ID yet
  if (userId) {
    const user = await User.findOne({ id: userId });
    if (user) {
      console.log("✅ Found user by Clerk ID (priority 2):", userId);
      return user;
    }
  }

  // PRIORITY 3: Try to find by email as last resort (least reliable due to possible duplicates)
  if (userEmail) {
    // Get the most recent user with this email (sorted by createdAt descending)
    const users = await User.find({ emailAddress: userEmail }).sort({ createdAt: -1 }).limit(2);
    
    if (users.length > 1) {
      console.warn(`⚠️ Multiple users found with email ${userEmail}. Using most recent: ${users[0].id}`);
    }
    
    if (users.length > 0) {
      console.log("✅ Found user by email (priority 3):", userEmail);
      return users[0]; // Return most recent
    }
  }

  console.log("❌ User not found with any identifier");
  return null;
}

export const POST = withRateLimit(RATE_LIMIT_CONFIGS.WEBHOOK)(async (req: NextRequest) => {
  await connectDB();
  
  if (process.env.LEMON_SQUEEZY_API_KEY) {
    lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });
  }

  const rawBody = await req.text();
  const headersList = await headers();
  const signature = headersList.get("x-signature") || headersList.get("X-Signature");

  if (!signature) {
    console.error("🚨 Missing Lemon Squeezy signature");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("🚨 Webhook verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("✅ Webhook signature verified successfully");

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("🚨 Invalid JSON payload");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data, meta } = event;
  const eventType = meta.event_name;

  console.log("📋 Processing webhook event:", eventType);
  console.log("Event data:", JSON.stringify(data, null, 2));

  try {
    switch (eventType) {
      case "subscription_payment_success": {
        // Handle subscription payment success (monthly renewal)
        const subscriptionInvoice = data;
        const customerId = subscriptionInvoice.attributes?.customer_id;
        const subscriptionId = subscriptionInvoice.attributes?.subscription_id;
        const userEmail = subscriptionInvoice.attributes?.user_email;
        
        // Get user_id from custom_data if available
        const customUserId = meta.custom_data?.user_id;

        console.log("🔍 subscription_payment_success - Looking for user with:", {
          customerId,
          userEmail,
          customUserId,
          subscriptionId,
        });

        // Try multiple methods to find the user
        let user = await findUser(customerId, userEmail, customUserId);

        if (!user) {
          console.error("🚨 User not found with any identifier:", {
            customerId,
            userEmail,
            customUserId,
          });
          return NextResponse.json({ 
            error: "User not found",
            details: "Could not locate user by customer ID, email, or user ID"
          }, { status: 404 });
        }

        console.log("✅ Found user:", {
          userId: user.id,
          email: user.emailAddress,
          currentPlan: user.plan?.id,
          currentCredits: user.credits,
        });

        // Update lemonsqueezyCustomerId if not set
        if (!user.lemonsqueezyCustomerId && customerId) {
          await User.updateOne(
            { id: user.id },
            { $set: { lemonsqueezyCustomerId: String(customerId) } }
          );
          console.log("✅ Updated user with lemonsqueezyCustomerId:", customerId);
        }

        // IMPORTANT: Get variantId from webhook payload first (if available in subscription_payment_success)
        // Fallback to API call if not available
        let plan;
        let variantId: number | string | undefined;
        
        // Try to get variantId from webhook payload (subscription_payment_success might have it in attributes)
        // Note: subscription_payment_success payload structure may differ from subscription_created
        variantId = subscriptionInvoice.attributes?.variant_id;
        
        // If not in webhook payload, fetch from API
        if (!variantId && subscriptionId) {
          console.log("⚠️ Fetching subscription from Lemon Squeezy:", subscriptionId);
          try {
            const { data: subscriptionData, error: subError } = await getSubscription(String(subscriptionId));
            if (!subError && subscriptionData?.data) {
              const subscription = subscriptionData.data;
              // Try variant_id from attributes first, then first_subscription_item
              variantId = subscription.attributes.variant_id || 
                         (subscription.attributes.first_subscription_item as any)?.variant_id;
              console.log("🔍 Fetched subscription, variantId:", variantId);
            } else {
              console.error("❌ Error fetching subscription:", subError);
            }
          } catch (error) {
            console.error("❌ Exception fetching subscription:", error);
          }
        }
        
        // Look up plan using variantId
        if (variantId) {
          plan = PricingPlans.find(
            (p) => p.variantId === String(variantId)
          );
          if (plan) {
            console.log("🔍 Found plan from subscription variantId:", {
              planId: plan.id,
              planName: plan.name,
              credits: plan.isFreeCredits,
            });
          }
        }
        
        // Fallback: Try to get plan from BusinessProfile if API call failed
        if (!plan) {
          const businessProfile = await BusinessProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user._id) 
          });
          if (businessProfile?.subscriptionTier) {
            plan = PricingPlans.find((p) => p.id === businessProfile.subscriptionTier);
            console.log("🔍 Fallback: Found plan from BusinessProfile:", {
              planId: plan?.id,
              planName: plan?.name,
              credits: plan?.isFreeCredits,
            });
          }
        }
        
        // Final fallback: Use user's current plan (WARNING: This might be stale!)
        if (!plan && user.plan?.id) {
          plan = PricingPlans.find((p) => p.id === user.plan.id);
          console.log("🔍 Using plan from user.plan (fallback):", {
            planId: plan?.id,
            planName: plan?.name,
            credits: plan?.isFreeCredits,
          });
        }

        if (!plan) {
          console.error("🚨 Could not determine plan. Subscription ID:", subscriptionId);
          return NextResponse.json({ 
            error: "Plan not found",
            details: "Could not determine subscription plan"
          }, { status: 404 });
        }

        console.log("💳 Processing payment with plan:", {
          planId: plan.id,
          planName: plan.name,
          creditsToSet: plan.isFreeCredits || 0,
        });

        // Update user and business profile
        await withTransaction(async (session) => {
          // Update user's plan and reset credits
          const userUpdateData = {
            "plan.id": plan.id,
            "plan.type": plan.type || "subscription",
            "plan.planType": plan.id, // Legacy field - frontend reads this
            "plan.name": plan.name,
            "plan.price": plan.price,
            "plan.isPremium": plan.popular || false,
            credits: plan.isFreeCredits || 0, // Reset credits on renewal
          };
          const updateResult = await User.updateOne(
            { id: user.id },
            { $set: userUpdateData },
            { session }
          );

          console.log("✅ User update result:", {
            matched: updateResult.matchedCount,
            modified: updateResult.modifiedCount,
          });

          // Get or create BusinessProfile
          let businessProfile = await BusinessProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user._id) 
          }).session(session);

          // Update BusinessProfile credits
          if (businessProfile) {
            const businessUpdateData = {
              aiCredits: plan.isFreeCredits || 0, // Update legacy aiCredits field
              aiCreditsRemaining: plan.isFreeCredits || 0,
              aiCreditsTotal: plan.isFreeCredits || 0,
              subscriptionStatus: "active",
              subscriptionTier: plan.id,
              lemonsqueezySubscriptionId: String(subscriptionId),
              lastCreditReset: new Date(), // Update reset timestamp
            };
            const businessUpdateResult = await BusinessProfile.findByIdAndUpdate(
              businessProfile._id,
              { $set: businessUpdateData },
              { session, new: true }
            );
            console.log("✅ BusinessProfile updated:", {
              businessId: businessUpdateResult?._id,
              aiCredits: businessUpdateResult?.aiCredits,
              aiCreditsRemaining: businessUpdateResult?.aiCreditsRemaining,
              aiCreditsTotal: businessUpdateResult?.aiCreditsTotal,
              subscriptionTier: businessUpdateResult?.subscriptionTier,
              subscriptionStatus: businessUpdateResult?.subscriptionStatus,
            });
          } else {
            // Create BusinessProfile if it doesn't exist
            const newBusinessProfile = await BusinessProfile.create([{
              userId: user._id,
              businessName: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : "Business",
              lemonsqueezySubscriptionId: String(subscriptionId),
              subscriptionStatus: "active",
              subscriptionTier: plan.id,
              aiCredits: plan.isFreeCredits || 0, // Legacy field
              aiCreditsRemaining: plan.isFreeCredits || 0,
              aiCreditsTotal: plan.isFreeCredits || 0,
              lastCreditReset: new Date(),
              creditResetDay: new Date().getDate(),
            }], { session });
            console.log("✅ Created BusinessProfile for user:", {
              userId: user.id,
              businessId: newBusinessProfile[0]._id,
              aiCredits: plan.isFreeCredits || 0,
              aiCreditsRemaining: plan.isFreeCredits || 0,
              subscriptionTier: plan.id,
            });
          }
        });

        console.log(`✅ Subscription payment processed successfully`, {
          userId: user.id,
          planId: plan.id,
          planName: plan.name,
          creditsSet: plan.isFreeCredits || 0,
        });

        // Create invoice from subscription invoice
        try {
          await createOrUpdateInvoiceFromLemonSqueezySubscriptionInvoice(
            subscriptionInvoice,
            user.id
          );
          console.log("✅ Invoice created/updated for subscription payment");
        } catch (invoiceError: any) {
          console.error("⚠️ Failed to create invoice:", invoiceError.message);
          // Don't fail the webhook if invoice creation fails
        }

        break;
      }

      case "order_created": {
        // [Keep your existing order_created logic here - unchanged]
        const order = data;
        const customerId = order.attributes.customer_id;
        const userEmail = order.attributes?.user_email;
        const customUserId = meta.custom_data?.user_id;
        const customData = order.attributes?.first_order_item?.product_options?.custom || 
                          order.attributes?.custom || {};

        const variantId = order.attributes?.first_order_item.variant_id;
        const status = order.attributes?.status;
        const orderId = order.id;
        const firstOrderItem = order.attributes?.first_order_item;
        
        // Check if this is a subscription order by matching variantId to subscription plans
        const isSubscription = variantId ? PricingPlans.some(
          (plan) => plan.variantId === String(variantId) && plan.type === "subscription"
        ) : false;

        let user = await findUser(customerId?.toString(), userEmail, customUserId);

        if (!user) {
          console.error("🚨 User not found:", customerId || userEmail);
          break;
        }

        // Update lemonsqueezyCustomerId if not set
        if (!user.lemonsqueezyCustomerId && customerId) {
          await User.updateOne(
            { id: user.id },
            { $set: { lemonsqueezyCustomerId: customerId.toString() } }
          );
        }

        // Check if invoice already exists for this order
        const existingInvoice = await Invoice.findOne({ lemonsqueezyOrderId: String(orderId) });

        // Skip invoice creation for subscription orders (subscription_payment_success will handle it)
        // Store the order ID in business profile so subscription_payment_success can use it
        if (isSubscription) {
          console.log("⏭️ Skipping invoice creation for subscription order (subscription_payment_success will handle it)");
          // Store order ID in business profile for subscription_payment_success to use
          const businessProfile = await BusinessProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user._id) 
          });
          if (businessProfile) {
            await BusinessProfile.findByIdAndUpdate(
              businessProfile._id,
              { $set: { lastOrderId: String(orderId) } }
            );
            console.log("💾 Stored order ID in business profile for subscription invoice:", orderId);
          }
        } else if (existingInvoice) {
          console.log("⏭️ Invoice already exists for this order, skipping creation");
        } else {
          // Create invoice from order (only for non-subscription orders)
          try {
            await createOrUpdateInvoiceFromLemonSqueezyOrder(order, user.id);
            console.log("✅ Invoice created/updated for order");
          } catch (invoiceError: any) {
            console.error("⚠️ Failed to create invoice:", invoiceError.message);
            // Don't fail the webhook if invoice creation fails
          }
        }

        // [Rest of your order_created logic...]
        // Check if model purchase, credit purchase, or plan purchase
        // (Keep your existing logic)
        
        break;
      }

      case "subscription_created": {
        // Handle new subscription creation
        const subscription = data;
        const customerId = subscription.attributes.customer_id;
        const subscriptionId = subscription.id; // Subscription ID is at root level for subscription_created
        const userEmail = subscription.attributes?.user_email;
        const customUserId = meta.custom_data?.user_id;

        console.log("🔍 subscription_created - Looking for user with:", {
          customerId,
          userEmail,
          customUserId,
          subscriptionId,
        });

        // Try multiple methods to find the user
        let user = await findUser(customerId?.toString(), userEmail, customUserId);

        if (!user) {
          console.error("🚨 User not found with any identifier:", {
            customerId,
            userEmail,
            customUserId,
          });
          return NextResponse.json({ 
            error: "User not found",
            details: "Could not locate user by customer ID, email, or user ID"
          }, { status: 404 });
        }

        console.log("✅ Found user:", {
          userId: user.id,
          email: user.emailAddress,
          currentPlan: user.plan?.id,
          currentCredits: user.credits,
        });

        // Update lemonsqueezyCustomerId if not set
        if (!user.lemonsqueezyCustomerId && customerId) {
          await User.updateOne(
            { id: user.id },
            { $set: { lemonsqueezyCustomerId: String(customerId) } }
          );
          console.log("✅ Updated user with lemonsqueezyCustomerId:", customerId);
        }

        // IMPORTANT: Get variantId from webhook payload first (it's already in subscription.attributes.variant_id)
        // Fallback to API call if not available
        let plan;
        let variantId: number | string | undefined;
        
        // First, try to get variantId directly from webhook payload
        variantId = subscription.attributes?.variant_id;
        
        // If not in webhook payload, fetch from API
        if (!variantId && subscriptionId) {
          console.log("⚠️ Fetching subscription from Lemon Squeezy:", subscriptionId);
          try {
            const { data: subscriptionData, error: subError } = await getSubscription(String(subscriptionId));
            if (!subError && subscriptionData?.data) {
              const subscriptionDataObj = subscriptionData.data;
              // Try variant_id from attributes first, then first_subscription_item
              variantId = subscriptionDataObj.attributes.variant_id || 
                         (subscriptionDataObj.attributes.first_subscription_item as any)?.variant_id;
              console.log("🔍 Fetched subscription, variantId:", variantId);
            } else {
              console.error("❌ Error fetching subscription:", subError);
            }
          } catch (error) {
            console.error("❌ Exception fetching subscriptimage.pngion:", error);
          }
        }
        
        // Look up plan using variantId
        if (variantId) {
          plan = PricingPlans.find(
            (p) => p.variantId === String(variantId)
          );
          if (plan) {
            console.log("🔍 Found plan from subscription variantId:", {
              planId: plan.id,
              planName: plan.name,
              credits: plan.isFreeCredits,
            });
          }
        }
        
        // Fallback: Try to get plan from BusinessProfile if API call failed
        if (!plan) {
          const businessProfile = await BusinessProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user._id) 
          });
          
          if (businessProfile?.subscriptionTier) {
            plan = PricingPlans.find((p) => p.id === businessProfile.subscriptionTier);
            console.log("🔍 Fallback: Found plan from BusinessProfile:", {
              planId: plan?.id,
              planName: plan?.name,
              credits: plan?.isFreeCredits,
            });
          }
        }
        
        // Final fallback: Use user's current plan
        if (!plan && user.plan?.id) {
          plan = PricingPlans.find((p) => p.id === user.plan.id);
          console.log("🔍 Using plan from user.plan (fallback):", {
            planId: plan?.id,
            planName: plan?.name,
            credits: plan?.isFreeCredits,
          });
        }

        if (!plan) {
          console.error("🚨 Could not determine plan. Subscription ID:", subscriptionId);
          return NextResponse.json({ 
            error: "Plan not found",
            details: "Could not determine subscription plan"
          }, { status: 404 });
        }

        console.log("💳 Processing subscription creation with plan:", {
          planId: plan.id,
          planName: plan.name,
          creditsToSet: plan.isFreeCredits || 0,
        });

        // Update user and business profile
        await withTransaction(async (session) => {
          // Update user's plan and set credits
          const userUpdateData = {
            "plan.id": plan.id,
            "plan.type": plan.type || "subscription",
            "plan.planType": plan.id, // Legacy field - frontend reads this
            "plan.name": plan.name,
            "plan.price": plan.price,
            "plan.isPremium": plan.popular || false,
            credits: plan.isFreeCredits || 0,
          };
          const updateResult = await User.updateOne(
            { id: user.id },
            { $set: userUpdateData },
            { session }
          );

          console.log("✅ User update result:", {
            matched: updateResult.matchedCount,
            modified: updateResult.modifiedCount,
          });

          // Get or create BusinessProfile
          let businessProfile = await BusinessProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user._id) 
          }).session(session);

          // Update BusinessProfile credits
          if (businessProfile) {
            const businessUpdateData = {
              aiCredits: plan.isFreeCredits || 0, // Update legacy aiCredits field
              aiCreditsRemaining: plan.isFreeCredits || 0,
              aiCreditsTotal: plan.isFreeCredits || 0,
              subscriptionStatus: "active",
              subscriptionTier: plan.id,
              lemonsqueezySubscriptionId: String(subscriptionId),
              lastCreditReset: new Date(), // Update reset timestamp
            };
            const businessUpdateResult = await BusinessProfile.findByIdAndUpdate(
              businessProfile._id,
              { $set: businessUpdateData },
              { session, new: true }
            );
            console.log("✅ BusinessProfile updated:", {
              businessId: businessUpdateResult?._id,
              aiCredits: businessUpdateResult?.aiCredits,
              aiCreditsRemaining: businessUpdateResult?.aiCreditsRemaining,
              aiCreditsTotal: businessUpdateResult?.aiCreditsTotal,
              subscriptionTier: businessUpdateResult?.subscriptionTier,
              subscriptionStatus: businessUpdateResult?.subscriptionStatus,
            });
          } else {
            // Create BusinessProfile if it doesn't exist
            const newBusinessProfile = await BusinessProfile.create([{
              userId: user._id,
              businessName: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : "Business",
              lemonsqueezySubscriptionId: String(subscriptionId),
              subscriptionStatus: "active",
              subscriptionTier: plan.id,
              aiCredits: plan.isFreeCredits || 0, // Legacy field
              aiCreditsRemaining: plan.isFreeCredits || 0,
              aiCreditsTotal: plan.isFreeCredits || 0,
              lastCreditReset: new Date(),
              creditResetDay: new Date().getDate(),
            }], { session });
            console.log("✅ Created BusinessProfile for user:", {
              userId: user.id,
              businessId: newBusinessProfile[0]._id,
              aiCredits: plan.isFreeCredits || 0,
              aiCreditsRemaining: plan.isFreeCredits || 0,
              subscriptionTier: plan.id,
            });
          }
        });

        console.log(`✅ Subscription created successfully`, {
          userId: user.id,
          planId: plan.id,
          planName: plan.name,
          creditsSet: plan.isFreeCredits || 0,
        });
        break;
      }

      case "subscription_updated":
      case "subscription_plan_changed":
      case "subscription_cancelled": {
        // [Keep your existing logic for these events]
        break;
      }

      default:
        console.warn(`⚠️ Unhandled event type: ${eventType}`);
        break;
    }
  } catch (err: any) {
    console.error(`🚨 Error processing event ${eventType}:`, {
      error: err.message,
      stack: err.stack,
      eventData: data,
    });
    
    return NextResponse.json({ 
      error: err.message,
      eventType,
      details: "Internal server error processing webhook"
    }, { status: 500 });
  }

  return NextResponse.json({ received: true });
});