import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import ModelPurchase from "@/models/model-purchase";
import Invoice from "@/models/invoice";
import { Credits, PricingPlans } from "@/lib/config/pricing";
import crypto from "crypto";
import { createLemonSqueezyPaymentHistory } from "@/lib/payment-utils";
import { withTransaction, withTransactionAndExternal } from "@/lib/transaction-utils";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { createLogger } from "@/lib/utils/logger";
import { getSubscription, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

const logger = createLogger({ component: "lemonsqueezy-webhook" });

/**
 * Verify Lemon Squeezy webhook signature
 * Uses HMAC SHA256 to verify the X-Signature header
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
 * Handles incoming Lemon Squeezy webhook events
 * Processes order_created, subscription_created, and subscription_updated events
 * 
 * Note: In Next.js App Router, we must read the raw body directly using req.text()
 * to get the unparsed request body for signature verification.
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.WEBHOOK)(async (req: NextRequest) => {
  await connectDB(); // Connect to MongoDB
  
  // Setup Lemon Squeezy API if not already configured
  if (process.env.LEMON_SQUEEZY_API_KEY) {
    lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });
  }

  // Get raw request body as text (required for signature verification)
  // In App Router, req.text() gives us the raw body
  const rawBody = await req.text();
  
  // Get X-Signature header (Lemon Squeezy sends it as "X-Signature")
  const headersList = await headers();
  const signature = headersList.get("x-signature") || headersList.get("X-Signature");

  if (!signature) {
    console.error("🚨 Missing Lemon Squeezy signature");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // Verify webhook signature
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

  let price_id;
  try {
    switch (eventType) {
      case "order_created": {
        // Handle one-time payment (credit purchases, model purchases, or plan purchases)
        const order = data;
        const customerId = order.attributes.customer_id;
        const userEmail = order.attributes?.user_email;
        const customData = order.attributes?.first_order_item?.product_options?.custom || 
                          order.attributes?.custom || {};

        const variantId = order.attributes?.first_order_item.variant_id;
        const priceId = order.attributes?.first_order_item.price_id;
        const status = order.attributes?.status;
        const orderId = order.id;

        if (!customerId) {
          console.error("🚨 No user identifier found in order");
          break;
        }

        let user;
        if (customerId) {
          user = await User.findOne({ lemonsqueezyCustomerId: customerId });
        } else {
          user = await User.findOne({ emailAddress: userEmail });
        }

        if (!user) {
          console.error("🚨 User not found:", customerId || userEmail);
          break;
        }

        // Check if this is a model purchase
        if (customData.type === "model_purchase") {
          const modelId = customData.modelId;
          const businessId = customData.businessId;
          const amount = parseInt(customData.amount || "0");
          const platformCommission = parseInt(customData.platformCommission || "0");
          const modelEarnings = parseInt(customData.modelEarnings || "0");

          if (!modelId || !businessId) {
            console.error("🚨 Model purchase order missing required data:", { modelId, businessId });
            break;
          }

          // Handle model purchase atomically
          await withTransaction(async (session) => {
            // Update purchase record to completed
            const purchase = await ModelPurchase.findOneAndUpdate(
              {
                $or: [
                  { lemonsqueezyCheckoutId: order.attributes.first_order_item?.checkout_id },
                  { businessId: businessId, modelId: modelId, status: "pending" },
                ],
              },
              {
                $set: {
                  status: status === "paid" ? "completed" : "pending",
                  completedAt: status === "paid" ? new Date() : undefined,
                  lemonsqueezyOrderId: orderId,
                },
              },
              { new: true, session }
            );

            if (!purchase) {
              logger.warn("Model purchase record not found for order", {
                orderId,
                modelId,
                businessId,
              });
              // Create purchase record if it doesn't exist
              const businessProfile = await BusinessProfile.findById(businessId).session(session);
              const modelProfile = await ModelProfile.findById(modelId).session(session);
              
              if (businessProfile && modelProfile) {
                await ModelPurchase.create([{
                  businessId: businessProfile._id,
                  modelId: modelProfile._id,
                  lemonsqueezyOrderId: orderId,
                  amount: amount,
                  currency: order.attributes.currency || "usd",
                  platformCommission: platformCommission,
                  modelEarnings: modelEarnings,
                  status: status === "paid" ? "completed" : "pending",
                  completedAt: status === "paid" ? new Date() : undefined,
                }], { session });
              }
            }

            // Only process if payment is successful
            if (status === "paid") {
              // Add model to business's purchasedModels array
              await BusinessProfile.findByIdAndUpdate(
                businessId,
                {
                  $addToSet: { purchasedModels: modelId },
                },
                { session }
              );

              // Update model's availableBalance (90% of purchase price) and earnings
              await ModelProfile.findByIdAndUpdate(
                modelId,
                {
                  $inc: { 
                    availableBalance: modelEarnings, // 90% goes to model
                    totalEarnings: amount, // Total purchase amount
                    platformCommission: platformCommission, // 10% platform commission
                    totalPurchases: 1,
                  },
                },
                { session }
              );

              logger.info("Model purchase completed", {
                orderId,
                modelId,
                businessId,
                amount,
                modelEarnings,
                platformCommission,
              });
            }
          });

          console.log(`✅ Model purchase processed: ${status === "paid" ? "completed" : "pending"}`);
          break;
        }

        // Check if this is a credit purchase
        const credit = Credits.plans.find(
          (p) => p.variantId === variantId?.toString() || p.variantId === variantId?.toString()
        );

        if (credit) {
          // Handle credit purchase atomically
          await withTransaction(async (session) => {
            await User.updateOne(
              { lemonsqueezyCustomerId: customerId },
              {
                $inc: {
                  credits: credit.credits,
                },
              },
              { session }
            );

            // Create payment history record for credit purchase
            // Sanitize webhookData to avoid circular references
            const sanitizedWebhookData = order ? JSON.parse(JSON.stringify(order)) : undefined;
            await createLemonSqueezyPaymentHistory(
              user.id,
              {
                orderId: order.id,
                customerId: customerId,
                amount: order.attributes.total / 100, // Convert from cents
                currency: order.attributes.currency,
                planId: credit.title,
                planName: credit.title,
                planType: "credits",
                planPrice: credit.price,
                isPremium: false,
                creditsAllocated: credit.credits,
                billingEmail: userEmail,
                webhookData: sanitizedWebhookData,
              },
              status === "paid" ? "succeeded" : "pending",
              session
            );

            // Create invoice record for credit purchase
            const businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
            const orderIdString = String(order.id); // Ensure order ID is a string
            await Invoice.findOneAndUpdate(
              { lemonsqueezyOrderId: orderIdString },
              {
                userId: user._id,
                businessId: businessProfile?._id,
                lemonsqueezyOrderId: orderIdString,
                invoiceNumber: order.attributes.order_number ? String(order.attributes.order_number) : `INV-${orderIdString.slice(-8).toUpperCase()}`,
                amountDue: order.attributes.total_usd || (order.attributes.total / 100), // Use USD amount if available, otherwise convert from cents
                currency: order.attributes.currency || "usd",
                status: status === "paid" ? "paid" : "open",
                hostedInvoiceUrl: order.attributes.urls?.receipt || undefined,
                periodStart: order.attributes.created_at ? new Date(order.attributes.created_at) : undefined,
                periodEnd: order.attributes.created_at ? new Date(order.attributes.created_at) : undefined,
                lineItems: [{
                  description: credit.title || "Credit Purchase",
                  amount: order.attributes.total_usd || (order.attributes.total / 100),
                  quantity: 1,
                }],
                paidAt: status === "paid" ? new Date() : undefined,
              },
              { upsert: true, new: true, session }
            );
          });

          console.log(`✅ User credited ${credit.credits} credits`);
        } else {
          // Check if this is a subscription plan purchase (initial payment)
          const plan = PricingPlans.find(
            (p) => p.variantId === variantId?.toString() || p.variantId?.toString() === variantId?.toString()
          );
          
          console.log("🔍 Checking for plan match:", {
            variantId,
            variantIdType: typeof variantId,
            plans: PricingPlans.map(p => ({ id: p.id, variantId: p.variantId, variantIdType: typeof p.variantId })),
            matchedPlan: plan,
          });

          if (plan && status === "paid") {
            // Handle subscription plan purchase (initial payment) atomically
            await withTransaction(async (session) => {
              // Update user plan
              await User.updateOne(
                { lemonsqueezyCustomerId: customerId },
                {
                  $set: {
                    "plan.id": plan.id,
                    "plan.type": plan.type || "premium",
                    "plan.name": plan.name,
                    "plan.price": plan.price,
                    "plan.isPremium": plan.popular || false,
                  },
                  $inc: {
                    credits: plan.isFreeCredits || 0,
                  },
                },
                { session }
              );

              // Get or create BusinessProfile
              let businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
              if (!businessProfile) {
                // Create BusinessProfile if it doesn't exist
                businessProfile = await BusinessProfile.create([{
                  userId: user._id,
                  businessName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Business",
                  aiCreditsRemaining: plan.isFreeCredits || 0,
                  aiCreditsTotal: plan.isFreeCredits || 0,
                  subscriptionTier: plan.id,
                  subscriptionStatus: "active",
                }], { session });
                businessProfile = businessProfile[0];
                console.log("✅ Created BusinessProfile for user:", user.id);
              } else {
                // Update existing BusinessProfile
                await BusinessProfile.findByIdAndUpdate(
                  businessProfile._id,
                  {
                    $set: {
                      subscriptionTier: plan.id,
                      subscriptionStatus: "active",
                      aiCreditsRemaining: plan.isFreeCredits || 0,
                      aiCreditsTotal: plan.isFreeCredits || 0,
                    },
                  },
                  { session }
                );
              }

              // Create payment history
              // Sanitize webhookData to avoid circular references
              const sanitizedWebhookData = order ? JSON.parse(JSON.stringify(order)) : undefined;
              await createLemonSqueezyPaymentHistory(
                user.id,
                {
                  orderId: order.id,
                  customerId: customerId,
                  amount: order.attributes.total / 100,
                  currency: order.attributes.currency,
                  planId: plan.id,
                  planName: plan.name,
                  planType: plan.type || "subscription",
                  planPrice: plan.price,
                  isPremium: plan.popular || false,
                  creditsAllocated: plan.isFreeCredits || 0,
                  billingEmail: userEmail,
                  webhookData: sanitizedWebhookData,
                },
                status === "paid" ? "succeeded" : "pending",
                session
              );

              // Create invoice record
              const orderIdString = String(order.id); // Ensure order ID is a string
              await Invoice.findOneAndUpdate(
                { lemonsqueezyOrderId: orderIdString },
                {
                  userId: user._id,
                  businessId: businessProfile?._id,
                  lemonsqueezyOrderId: orderIdString,
                  invoiceNumber: order.attributes.order_number ? String(order.attributes.order_number) : `INV-${orderIdString.slice(-8).toUpperCase()}`,
                  amountDue: order.attributes.total_usd || (order.attributes.total / 100), // Use USD amount if available, otherwise convert from cents
                  currency: order.attributes.currency || "usd",
                  status: status === "paid" ? "paid" : "open",
                  hostedInvoiceUrl: order.attributes.urls?.receipt || undefined,
                  periodStart: order.attributes.created_at ? new Date(order.attributes.created_at) : undefined,
                  periodEnd: order.attributes.created_at ? new Date(order.attributes.created_at) : undefined,
                  lineItems: [{
                    description: plan.name || "Subscription",
                    amount: order.attributes.total_usd || (order.attributes.total / 100),
                    quantity: 1,
                  }],
                  paidAt: status === "paid" ? new Date() : undefined,
                },
                { upsert: true, new: true, session }
              );
            });

            console.log(`✅ Subscription plan purchase processed: ${plan.name}, Credits: ${plan.isFreeCredits || 0}`);
          } else if (!plan) {
            console.warn("⚠️ No matching plan found for variantId:", variantId);
          }
        }

        break;
      }

      case "subscription_updated": {
        // Handle subscription updates (plan changes)
        const subscription = data;
        const subscriptionId = subscription.id;
        const customerId = subscription.attributes.customer_id;
        const status = subscription.attributes.status;
        const variantId = subscription.attributes.first_subscription_item?.variant_id;
        const currentPeriodEnd = subscription.attributes.renews_at 
          ? new Date(subscription.attributes.renews_at) 
          : undefined;

        if (!customerId) {
          console.error("🚨 No customer ID found in subscription update");
          break;
        }

        let user;
        if (customerId) {
          user = await User.findOne({ lemonsqueezyCustomerId: customerId });
        }

        if (!user) {
          console.error("🚨 User not found:", customerId);
          break;
        }

        // Find the plan based on variant ID
        const plan = PricingPlans.find((p) => p.variantId === variantId?.toString());

        if (plan) {
          await withTransaction(async (session) => {
            // For subscription updates (plan changes), SET credits instead of incrementing
            // Check if this is an upgrade by comparing current plan
            const currentBusinessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
            const isUpgrade = currentBusinessProfile?.subscriptionTier && 
                             currentBusinessProfile.subscriptionTier !== plan.id;
            
            await User.updateOne(
              { id: user.id },
              {
                $set: {
                  "plan.id": plan.id,
                  "plan.type": plan.type || "premium",
                  "plan.name": plan.name,
                  "plan.price": plan.price,
                  "plan.isPremium": plan.popular || false,
                  // SET credits for upgrades, increment for renewals (if not an upgrade)
                  ...(isUpgrade ? { credits: plan.isFreeCredits || 0 } : { $inc: { credits: plan.isFreeCredits || 0 } }),
                },
              },
              { session }
            );

            // Update BusinessProfile with subscription info
            const businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
            if (businessProfile) {
              await BusinessProfile.findByIdAndUpdate(
                businessProfile._id,
                {
                  $set: {
                    lemonsqueezySubscriptionId: subscriptionId,
                    subscriptionStatus: status,
                    subscriptionCurrentPeriodEnd: currentPeriodEnd,
                    subscriptionTier: plan.id,
                    aiCreditsRemaining: plan.isFreeCredits || 0,
                    aiCreditsTotal: plan.isFreeCredits || 0,
                  },
                },
                { session }
              );
            }
          });

          console.log(
            `✅ Updated plan for user: ${user.id}, New Plan: ${plan.name}`
          );
        }
        break;
      }

      case "subscription_payment_success": {
        // Handle subscription payment success (monthly renewal)
        // Note: This event sends a subscription-invoice, not a subscription object
        const subscriptionInvoice = data;
        const customerId = subscriptionInvoice.attributes?.customer_id;
        const subscriptionId = subscriptionInvoice.attributes?.subscription_id;

        if (!customerId) {
          console.error("🚨 No user identifier found in subscription payment");
          break;
        }

        let user;
        if (customerId) {
          user = await User.findOne({ lemonsqueezyCustomerId: customerId });
        }

        if (!user) {
          console.error("🚨 User not found:", customerId);
          break;
        }

        // Try to get plan from BusinessProfile first
        const businessProfile = await BusinessProfile.findOne({ userId: user._id });
        let plan;
        
        if (businessProfile?.subscriptionTier) {
          plan = PricingPlans.find((p) => p.id === businessProfile.subscriptionTier);
          console.log("🔍 Found plan from BusinessProfile:", plan?.id, plan?.name);
        }
        
        // If we can't find plan from BusinessProfile, fetch subscription from Lemon Squeezy to get variant_id
        if (!plan && subscriptionId) {
          console.log("⚠️ Could not determine plan from BusinessProfile, fetching subscription from Lemon Squeezy:", subscriptionId);
          try {
            const { data: subscriptionData, error: subError } = await getSubscription(subscriptionId);
            if (!subError && subscriptionData?.data) {
              const subscription = subscriptionData.data;
              // Access variant_id with type assertion since TypeScript types may be incomplete
              const firstItem = subscription.attributes.first_subscription_item as any;
              const variantId = firstItem?.variant_id;
              console.log("🔍 Fetched subscription, variantId:", variantId);
              
              if (variantId) {
                plan = PricingPlans.find(
                  (p) => p.variantId === variantId?.toString() || p.variantId?.toString() === variantId?.toString()
                );
                console.log("🔍 Found plan from subscription variantId:", plan?.id, plan?.name);
              }
            }
          } catch (error) {
            console.error("❌ Error fetching subscription:", error);
          }
        }
        
        // If still no plan, try to get from user's current plan (fallback)
        if (!plan && user.plan?.id) {
          plan = PricingPlans.find((p) => p.id === user.plan.id);
          console.log("🔍 Using plan from user.plan (fallback):", plan?.id, plan?.name);
        }

        if (!plan) {
          console.error("🚨 Could not determine plan for subscription payment. Subscription ID:", subscriptionId);
          break;
        }

        if (plan) {
          // Reset credits on monthly renewal
          await withTransactionAndExternal(
            // Database operations
            async (session) => {
              // Update user's plan and reset credits to plan's free credits
              await User.updateOne(
                { id: user.id },
                {
                  $set: {
                    "plan.id": plan.id,
                    "plan.type": plan.type || "premium",
                    "plan.name": plan.name,
                    "plan.price": plan.price,
                    "plan.isPremium": plan.popular || false,
                    credits: plan.isFreeCredits || 0, // Reset credits on renewal
                  },
                },
                { session }
              );

              // Update BusinessProfile credits
              const businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
              if (businessProfile) {
                await BusinessProfile.findByIdAndUpdate(
                  businessProfile._id,
                  {
                    $set: {
                      aiCreditsRemaining: plan.isFreeCredits || 0,
                      aiCreditsTotal: plan.isFreeCredits || 0,
                      // Note: subscription-invoice doesn't have renews_at, 
                      // subscriptionCurrentPeriodEnd will be updated from subscription_updated event
                    },
                  },
                  { session }
                );
              }

              return { user, plan };
            },
            // External API operations
            async (dbResult) => {
              // Update Clerk user metadata with plan information
              await (
                await clerkClient()
              ).users.updateUser(dbResult.user.id, {
                privateMetadata: {
                  plan: dbResult.plan?.name,
                },
                publicMetadata: {
                  plan: dbResult.plan?.name,
                },
              });
            }
          );

          console.log(`✅ Subscription payment successful, credits reset for plan: ${plan?.name}`);
        }
        break;
      }

      case "subscription_cancelled": {
        // Handle subscription cancellations
        const subscription = data;
        const customerId = subscription.attributes.customer_id;
        const subscriptionId = subscription.id;

        if (!customerId) {
          console.error(
            "🚨 No customer ID found in subscription cancellation"
          );
          break;
        }

        let user;
        if (customerId) {
          user = await User.findOne({ lemonsqueezyCustomerId: customerId });
        }

        if (!user) {
          console.error("🚨 User not found:", customerId);
          break;
        }

        // Reset user's plan to free tier with transaction and external API call
        await withTransactionAndExternal(
          // Database operations
          async (session) => {
            await User.updateOne(
              { id: user.id },
              {
                $set: {
                  "plan.id": "free",
                  "plan.type": "free",
                  "plan.name": "Free",
                  "plan.price": "0",
                  "plan.isPremium": false,
                },
              },
              { session }
            );

            // Update BusinessProfile
            const businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
            if (businessProfile) {
              await BusinessProfile.findByIdAndUpdate(
                businessProfile._id,
                {
                  $set: {
                    subscriptionStatus: "canceled",
                    subscriptionTier: "free",
                    // Keep subscription ID for reference but mark as canceled
                  },
                },
                { session }
              );
            }

            return { user };
          },
          // External API operations
          async (dbResult) => {
            // Update Clerk user metadata to reflect free plan
            await (
              await clerkClient()
            ).users.updateUser(dbResult.user.id, {
              privateMetadata: { plan: "free" },
              publicMetadata: { plan: "free" },
            });
          }
        );

        console.log(`✅ Subscription canceled, user downgraded to free plan`);
        break;
      }

      case "subscription_created": {
        const subscription = data;
        const customerId = subscription.attributes.customer_id;
        const status = subscription.attributes.status;
        const subscriptionId = subscription.id;
        // Try to get variant_id from first_subscription_item, or directly from attributes
        const variantId = subscription.attributes.variant_id || 
                         (subscription.attributes.first_subscription_item as any)?.variant_id;
        const currentPeriodEnd = subscription.attributes.renews_at 
          ? new Date(subscription.attributes.renews_at) 
          : undefined;

        if (!customerId) {
          console.error("🚨 No user identifier found in subscription creation");
          break;
        }

        let user;
        if (customerId) {
          user = await User.findOne({ lemonsqueezyCustomerId: customerId });
        }

        if (!user) {
          console.error("🚨 User not found:", customerId);
          break;
        }

        const plan = PricingPlans.find(
          (p) => p.variantId === variantId?.toString() || p.variantId?.toString() === variantId?.toString()
        );

        console.log("🔍 Subscription created - checking plan match:", {
          variantId,
          variantIdType: typeof variantId,
          subscriptionId,
          status,
          customerId,
          plans: PricingPlans.map(p => ({ id: p.id, variantId: p.variantId })),
          matchedPlan: plan,
        });

        if (status === "active" && plan) {
          await withTransaction(async (session) => {
            // Update user plan
            await User.updateOne(
              {
                lemonsqueezyCustomerId: customerId,
              },
              {
                $set: {
                  "plan.id": plan.id,
                  "plan.type": plan.type || "premium",
                  "plan.name": plan.name,
                  "plan.price": plan.price,
                  "plan.isPremium": plan.popular || false,
                },
                $inc: {
                  credits: plan.isFreeCredits || 0,
                },
              },
              { session }
            );

            // Get or create BusinessProfile
            let businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
            if (!businessProfile) {
              // Create BusinessProfile if it doesn't exist
              businessProfile = await BusinessProfile.create([{
                userId: user._id,
                businessName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Business",
                lemonsqueezySubscriptionId: subscriptionId,
                subscriptionStatus: status,
                subscriptionCurrentPeriodEnd: currentPeriodEnd,
                subscriptionTier: plan.id,
                aiCreditsRemaining: plan.isFreeCredits || 0,
                aiCreditsTotal: plan.isFreeCredits || 0,
              }], { session });
              businessProfile = businessProfile[0];
              console.log("✅ Created BusinessProfile for user:", user.id);
            } else {
              // Update existing BusinessProfile with subscription info
              await BusinessProfile.findByIdAndUpdate(
                businessProfile._id,
                {
                  $set: {
                    lemonsqueezySubscriptionId: subscriptionId,
                    subscriptionStatus: status,
                    subscriptionCurrentPeriodEnd: currentPeriodEnd,
                    subscriptionTier: plan.id,
                    aiCreditsRemaining: plan.isFreeCredits || 0,
                    aiCreditsTotal: plan.isFreeCredits || 0,
                  },
                },
                { session }
              );
            }
          });

          console.log(`✅ Subscription created and user upgraded to plan: ${plan.name}, Credits: ${plan.isFreeCredits || 0}`);
        } else {
          console.warn("⚠️ Subscription created but plan not matched or status not active:", {
            status,
            planFound: !!plan,
            variantId,
          });
        }

        break;
      }

      case "subscription_plan_changed": {
        // Handle subscription plan change (similar to subscription_updated)
        const subscription = data;
        const customerId = subscription.attributes.customer_id;
        const status = subscription.attributes.status;
        const subscriptionId = subscription.id;
        const variantId = subscription.attributes.variant_id; // variant_id is directly on attributes for this event
        const currentPeriodEnd = subscription.attributes.renews_at 
          ? new Date(subscription.attributes.renews_at) 
          : undefined;

        if (!customerId) {
          console.error("🚨 No customer ID found in subscription plan change");
          break;
        }

        let user;
        if (customerId) {
          user = await User.findOne({ lemonsqueezyCustomerId: customerId });
        }

        if (!user) {
          console.error("🚨 User not found:", customerId);
          break;
        }

        const plan = PricingPlans.find(
          (p) => p.variantId === variantId?.toString() || p.variantId?.toString() === variantId?.toString()
        );

        console.log("🔍 Subscription plan changed - checking plan match:", {
          variantId,
          variantIdType: typeof variantId,
          subscriptionId,
          status,
          customerId,
          plans: PricingPlans.map(p => ({ id: p.id, variantId: p.variantId })),
          matchedPlan: plan,
        });

        if (status === "active" && plan) {
          await withTransaction(async (session) => {
            // For plan changes (upgrades/downgrades), SET credits instead of incrementing
            // This ensures users get the correct credit amount for their new plan
            await User.updateOne(
              {
                lemonsqueezyCustomerId: customerId,
              },
              {
                $set: {
                  "plan.id": plan.id,
                  "plan.type": plan.type || "premium",
                  "plan.name": plan.name,
                  "plan.price": plan.price,
                  "plan.isPremium": plan.popular || false,
                  credits: plan.isFreeCredits || 0, // SET credits for upgrades
                },
              },
              { session }
            );

            // Get or create BusinessProfile
            let businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(session);
            if (!businessProfile) {
              businessProfile = await BusinessProfile.create([{
                userId: user._id,
                businessName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Business",
                lemonsqueezySubscriptionId: subscriptionId,
                subscriptionStatus: status,
                subscriptionCurrentPeriodEnd: currentPeriodEnd,
                subscriptionTier: plan.id,
                aiCreditsRemaining: plan.isFreeCredits || 0,
                aiCreditsTotal: plan.isFreeCredits || 0,
              }], { session });
              businessProfile = businessProfile[0];
              console.log("✅ Created BusinessProfile for user:", user.id);
            } else {
              // Update existing BusinessProfile with subscription info
              await BusinessProfile.findByIdAndUpdate(
                businessProfile._id,
                {
                  $set: {
                    lemonsqueezySubscriptionId: subscriptionId,
                    subscriptionStatus: status,
                    subscriptionCurrentPeriodEnd: currentPeriodEnd,
                    subscriptionTier: plan.id,
                    aiCreditsRemaining: plan.isFreeCredits || 0,
                    aiCreditsTotal: plan.isFreeCredits || 0,
                  },
                },
                { session }
              );
            }
          });

          console.log(`✅ Subscription plan changed and user upgraded to plan: ${plan.name}, Credits: ${plan.isFreeCredits || 0}`);
        } else {
          console.warn("⚠️ Subscription plan changed but plan not matched or status not active:", {
            status,
            planFound: !!plan,
            variantId,
          });
        }

        break;
      }

      default:
        console.warn(`⚠️ Unhandled event type: ${eventType}`);
        break;
    }
  } catch (err: any) {
    console.error(`🚨 Error processing event ${eventType}: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
});
