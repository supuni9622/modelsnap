import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import { Credits, PricingPlans } from "@/lib/config/pricing";
import { getCreditsForPlan } from "@/lib/credit-utils";
import { stripe } from "@/lib/stripe";
import {
  createStripePaymentHistory,
  updatePaymentStatus,
} from "@/lib/payment-utils";
import { createLogger } from "@/lib/utils/logger";
import { withTransaction, withTransactionAndExternal } from "@/lib/transaction-utils";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { createOrUpdateInvoiceFromStripe } from "@/lib/invoice-utils";
import { sendInvoiceNotificationEmail } from "@/lib/email-notifications";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Create logger with context for this webhook handler
const logger = createLogger({ component: "stripe-webhook" });

/**
 * Disable Next.js body parsing since we need the raw body for Stripe webhook verification
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Handles incoming Stripe webhook events
 * Processes subscription updates, checkout completions, and subscription cancellations
 * 
 * @param req - The incoming webhook request from Stripe
 * @returns Response indicating success or failure of webhook processing
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.WEBHOOK)(async (req: NextRequest) => {
  // Check if Stripe is configured
  if (!stripe) {
    logger.error("Stripe is not configured - missing STRIPE_SECRET_KEY environment variable");
    return NextResponse.json(
      { error: "Payment service temporarily unavailable" },
      { status: 503 }
    );
  }

  await connectDB(); // Connect to MongoDB

  // Get raw request body and verify Stripe signature
  const rawBody = await new Response(req.body).text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    logger.error("Webhook request missing Stripe signature header");
    return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    logger.info("Webhook signature verified successfully", { eventType: event.type });
  } catch (error) {
    const err = error as Error;
    logger.error("Webhook signature verification failed", err, { signature: signature?.slice(0, 20) + '...' });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { data, type: eventType } = event;

  try {
    switch (eventType) {
      case "customer.subscription.updated": {
        // Handle subscription updates (e.g. plan changes)
        const subscription = data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (!customerId) {
          logger.error("Subscription update webhook missing customer ID", undefined, { subscriptionId: subscription.id });
          return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
        }

        const customer = await stripe.customers.retrieve(customerId);
        if (!("email" in customer) || !customer.email) {
          logger.error("Customer record missing email address", undefined, { customerId });
          return NextResponse.json({ error: "Invalid customer data" }, { status: 400 });
        }

        const user = await User.findOne({ emailAddress: customer.email });
        if (!user) {
          logger.error("User not found for customer email in subscription update", undefined, { customerEmail: customer.email });
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const plan = PricingPlans.find(
          (p) => p.priceId === subscription.items.data[0].price.id
        );
        if (!plan) {
          logger.error("No matching pricing plan found for subscription", undefined, { 
            priceId: subscription.items.data[0].price.id,
            userId: user.id 
          });
          return NextResponse.json({ error: "Invalid pricing plan" }, { status: 400 });
        }

        // Find or create BusinessProfile
        let businessProfile = await BusinessProfile.findOne({ userId: user._id });
        if (!businessProfile) {
          // Create BusinessProfile if it doesn't exist
          businessProfile = await BusinessProfile.create({
            userId: user._id,
            businessName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Business",
            subscriptionTier: plan.id as "free" | "starter" | "growth",
            aiCreditsRemaining: plan.isFreeCredits || 0,
            aiCreditsTotal: plan.isFreeCredits || 0,
            subscriptionStatus: "active",
            lastCreditReset: new Date(),
            creditResetDay: new Date().getDate(),
          });
        }

        const oldTier = businessProfile.subscriptionTier;
        const newTier = plan.id as "free" | "starter" | "growth";
        const creditsForNewPlan = getCreditsForPlan(plan.id);

        // Determine if upgrade or downgrade
        const tierOrder = { free: 0, starter: 1, growth: 2 };
        const isUpgrade = tierOrder[newTier] > tierOrder[oldTier as keyof typeof tierOrder];
        const isDowngrade = tierOrder[newTier] < tierOrder[oldTier as keyof typeof tierOrder];

        await withTransaction(async (session) => {
          if (isUpgrade) {
            // Upgrade: Grant full credits for new tier immediately
            await BusinessProfile.findByIdAndUpdate(
              businessProfile!._id,
              {
                $set: {
                  subscriptionTier: newTier,
                  aiCreditsRemaining: creditsForNewPlan,
                  aiCreditsTotal: creditsForNewPlan,
                  stripeSubscriptionId: subscription.id,
                  subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  subscriptionStatus: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "active",
                },
              },
              { session }
            );
          } else if (isDowngrade) {
            // Downgrade: Cap credits at new tier limit (keep remaining if less than limit)
            const cappedCredits = Math.min(businessProfile!.aiCreditsRemaining, creditsForNewPlan);
            await BusinessProfile.findByIdAndUpdate(
              businessProfile!._id,
              {
                $set: {
                  subscriptionTier: newTier,
                  aiCreditsRemaining: cappedCredits,
                  aiCreditsTotal: creditsForNewPlan,
                  stripeSubscriptionId: subscription.id,
                  subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  subscriptionStatus: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "active",
                },
              },
              { session }
            );
          } else {
            // Same tier: Just update subscription details
            await BusinessProfile.findByIdAndUpdate(
              businessProfile!._id,
              {
                $set: {
                  stripeSubscriptionId: subscription.id,
                  subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  subscriptionStatus: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "active",
                },
              },
              { session }
            );
          }

          // Also update User model for backward compatibility
          await User.updateOne(
            { emailAddress: customer.email },
            {
              $set: {
                "plan.id": plan.id,
                "plan.type": plan.type || "premium",
                "plan.name": plan.name,
                "plan.price": plan.price,
                "plan.isPremium": plan.popular || false,
              },
            },
            { session }
          );
        });

        logger.info("Successfully updated subscription plan", { 
          userId: user.id,
          businessProfileId: businessProfile._id,
          oldTier,
          newTier,
          planName: plan.name,
          isUpgrade,
          isDowngrade,
          creditsGranted: isUpgrade ? creditsForNewPlan : undefined
        });
        break;
      }

      case "invoice.paid":
      case "invoice.created":
      case "invoice.updated": {
        // Handle invoice events - create or update invoice record
        const stripeInvoice = data.object as Stripe.Invoice;
        
        if (!stripeInvoice.customer) {
          logger.warn("Invoice event missing customer ID", { invoiceId: stripeInvoice.id });
          break;
        }

        const customer = await stripe.customers.retrieve(
          stripeInvoice.customer as string
        );
        
        if (!("email" in customer) || !customer.email) {
          logger.warn("Customer record missing email for invoice", { 
            invoiceId: stripeInvoice.id,
            customerId: stripeInvoice.customer 
          });
          break;
        }

        const user = await User.findOne({ emailAddress: customer.email });
        if (!user) {
          logger.warn("User not found for invoice customer email", { 
            invoiceId: stripeInvoice.id,
            customerEmail: customer.email 
          });
          break;
        }

        try {
          await createOrUpdateInvoiceFromStripe(stripeInvoice, user.id);
          logger.info("Invoice synced successfully", {
            invoiceId: stripeInvoice.id,
            userId: user.id,
            status: stripeInvoice.status,
            eventType
          });

          // Handle credit reset for monthly subscription renewal
          if (eventType === "invoice.paid" && stripeInvoice.billing_reason === "subscription_cycle") {
            const businessProfile = await BusinessProfile.findOne({ userId: user._id });
            if (businessProfile && businessProfile.subscriptionTier !== "free") {
              // Get subscription to determine current plan
              if (stripeInvoice.subscription && typeof stripeInvoice.subscription === "string") {
                const subscription = await stripe.subscriptions.retrieve(stripeInvoice.subscription);
                const priceId = subscription.items.data[0]?.price?.id;
                const plan = PricingPlans.find((p) => p.priceId === priceId);
                
                if (plan) {
                  const creditsForPlan = getCreditsForPlan(plan.id);
                  
                  await withTransaction(async (session) => {
                    await BusinessProfile.findByIdAndUpdate(
                      businessProfile._id,
                      {
                        $set: {
                          aiCreditsRemaining: creditsForPlan,
                          aiCreditsTotal: creditsForPlan,
                          subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                          subscriptionStatus: "active",
                        },
                      },
                      { session }
                    );
                  });

                  logger.info("Credits reset for monthly renewal", {
                    userId: user.id,
                    businessProfileId: businessProfile._id,
                    planId: plan.id,
                    creditsReset: creditsForPlan,
                    invoiceId: stripeInvoice.id,
                  });
                }
              }
            }
          }

          // Send invoice notification email (only for created or paid invoices)
          if (eventType === "invoice.created" || eventType === "invoice.paid") {
            if (user.emailAddress?.[0]) {
              const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
              const invoiceUrl = stripeInvoice.hosted_invoice_url || `${APP_URL}/app/invoices/${stripeInvoice.id}`;
              
              sendInvoiceNotificationEmail(
                user.emailAddress[0],
                userName,
                stripeInvoice.number || stripeInvoice.id,
                stripeInvoice.amount_due / 100,
                stripeInvoice.currency,
                invoiceUrl,
                stripeInvoice.invoice_pdf || undefined
              ).catch((err) => logger.error("Failed to send invoice notification email", err as Error));
            }
          }
        } catch (error) {
          logger.error("Failed to sync invoice", error as Error, {
            invoiceId: stripeInvoice.id,
            userId: user.id
          });
        }
        break;
      }

      case "checkout.session.completed": {
        // Handle successful checkout sessions (one-time purchases or subscription starts)
        const checkoutSession = await stripe.checkout.sessions.retrieve(
          (data.object as Stripe.Checkout.Session).id,
          { expand: ["line_items", "invoice"] }
        );

        if (checkoutSession.payment_status !== "paid") {
          logger.warn("Checkout session completed but payment not confirmed", { 
            sessionId: checkoutSession.id,
            paymentStatus: checkoutSession.payment_status 
          });
          return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
        }

        const customerId = checkoutSession.customer as string;
        if (!customerId) {
          logger.error("Checkout session missing customer ID", undefined, { sessionId: checkoutSession.id });
          return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
        }

        const customer = await stripe.customers.retrieve(customerId);
        if (!("email" in customer) || !customer.email) {
          logger.error("Customer record missing email in checkout session", undefined, { customerId });
          return NextResponse.json({ error: "Invalid customer data" }, { status: 400 });
        }

        const user = await User.findOne({ emailAddress: customer.email });
        if (!user) {
          logger.error("User not found for customer email in checkout session", undefined, { customerEmail: customer.email });
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // If there's an invoice in the session, sync it
        if (checkoutSession.invoice && typeof checkoutSession.invoice === "string") {
          try {
            const invoice = await stripe.invoices.retrieve(checkoutSession.invoice);
            await createOrUpdateInvoiceFromStripe(invoice, user.id);
            logger.info("Invoice synced from checkout session", {
              invoiceId: invoice.id,
              sessionId: checkoutSession.id,
              userId: user.id
            });
          } catch (error) {
            logger.error("Failed to sync invoice from checkout session", error as Error, {
              invoiceId: checkoutSession.invoice,
              sessionId: checkoutSession.id
            });
          }
        }

        // Check if this is a model purchase (one-time payment)
        if (checkoutSession.mode === "payment" && checkoutSession.metadata?.type === "model_purchase") {
          // Handle model purchase
          const modelId = checkoutSession.metadata.modelId;
          const businessId = checkoutSession.metadata.businessId;
          const amount = parseInt(checkoutSession.metadata.amount || "0");
          const platformCommission = parseInt(checkoutSession.metadata.platformCommission || "0");
          const modelEarnings = parseInt(checkoutSession.metadata.modelEarnings || "0");

          if (!modelId || !businessId) {
            logger.error("Model purchase metadata missing", undefined, {
              sessionId: checkoutSession.id,
              metadata: checkoutSession.metadata,
            });
            return NextResponse.json({ error: "Invalid purchase metadata" }, { status: 400 });
          }

          // Import ModelPurchase and ModelProfile
          const ModelPurchase = (await import("@/models/model-purchase")).default;
          const ModelProfile = (await import("@/models/model-profile")).default;

          await withTransaction(async (dbSession) => {
            // Update purchase record to completed
            const purchase = await ModelPurchase.findOneAndUpdate(
              {
                stripeCheckoutSessionId: checkoutSession.id,
                status: "pending",
              },
              {
                $set: {
                  status: "completed",
                  completedAt: new Date(),
                  stripePaymentIntentId: checkoutSession.payment_intent as string || checkoutSession.id,
                },
              },
              { new: true, session: dbSession }
            );

            if (!purchase) {
              logger.warn("Model purchase record not found for checkout session", {
                sessionId: checkoutSession.id,
                modelId,
                businessId,
              });
              // Create purchase record if it doesn't exist
              await ModelPurchase.create([{
                businessId,
                modelId,
                stripePaymentIntentId: checkoutSession.payment_intent as string || checkoutSession.id,
                stripeCheckoutSessionId: checkoutSession.id,
                amount,
                currency: "usd",
                platformCommission,
                modelEarnings,
                status: "completed",
                completedAt: new Date(),
              }], { session: dbSession });
            }

            // Add model to business's purchasedModels array
            await BusinessProfile.findByIdAndUpdate(
              businessId,
              {
                $addToSet: { purchasedModels: modelId },
              },
              { session: dbSession }
            );

            // Update model's availableBalance (90% of purchase price)
            await ModelProfile.findByIdAndUpdate(
              modelId,
              {
                $inc: { availableBalance: modelEarnings },
              },
              { session: dbSession }
            );
          });

          logger.info("Model purchase completed successfully", {
            sessionId: checkoutSession.id,
            modelId,
            businessId,
            amount,
            modelEarnings,
            platformCommission,
          });

          return NextResponse.json({ received: true, type: "model_purchase" });
        }

        const priceId = checkoutSession.line_items?.data[0]?.price?.id;
        const creditPlan = Credits.plans.find((c) => c.priceId === priceId);
        const plan = PricingPlans.find((p) => p.priceId === priceId);

        if (creditPlan) {
          // Handle credit package purchase atomically
          await withTransaction(async (dbSession) => {
            await User.updateOne(
              { emailAddress: customer.email },
              { $inc: { credits: creditPlan.credits } },
              { session: dbSession }
            );

            // Create payment history record
            await createStripePaymentHistory(
              user.id,
              {
                paymentIntentId: checkoutSession.id?.toString() || "unknown", // Use session ID as payment intent ID
                customerId: customerId,
                amount: 0, // Amount will be set from plan data
                currency: "usd", // Default currency
                planId: creditPlan.title || "credits",
                planName: creditPlan.title,
                planType: "credits",
                planPrice: creditPlan.price,
                isPremium: false,
                creditsAllocated: creditPlan.credits,
                billingEmail: customer.email || undefined,
                billingName: customer.name || undefined,
                webhookData: checkoutSession as unknown as Record<string, unknown>,
              },
              "succeeded",
              dbSession
            );
          });

          logger.info("Successfully added credits to user account", {
            userId: user.id,
            creditsAdded: creditPlan.credits,
            planTitle: creditPlan.title
          });
        } else if (plan) {
          // Handle subscription plan purchase with transaction and external API call
          await withTransactionAndExternal(
            // Database operations
            async (dbSession) => {
              // Find or create BusinessProfile
              let businessProfile = await BusinessProfile.findOne({ userId: user._id }).session(dbSession);
              
              if (!businessProfile) {
                // Create BusinessProfile if it doesn't exist
                businessProfile = await BusinessProfile.create([{
                  userId: user._id,
                  businessName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Business",
                  subscriptionTier: plan.id as "free" | "starter" | "growth",
                  aiCreditsRemaining: plan.isFreeCredits || 0,
                  aiCreditsTotal: plan.isFreeCredits || 0,
                  subscriptionStatus: "active",
                  lastCreditReset: new Date(),
                  creditResetDay: new Date().getDate(),
                }], { session: dbSession });
                businessProfile = businessProfile[0];
              } else {
                // Update existing BusinessProfile
                const creditsForPlan = getCreditsForPlan(plan.id);
                
                // Get subscription ID if this is a subscription
                let subscriptionId: string | undefined;
                let subscriptionPeriodEnd: Date | undefined;
                
                if (checkoutSession.mode === "subscription" && checkoutSession.subscription) {
                  subscriptionId = typeof checkoutSession.subscription === "string" 
                    ? checkoutSession.subscription 
                    : checkoutSession.subscription.id;
                  
                  if (subscriptionId && stripe) {
                    try {
                      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                      subscriptionPeriodEnd = new Date(subscription.current_period_end * 1000);
                    } catch (err) {
                      logger.warn("Failed to retrieve subscription for period end", { subscriptionId });
                    }
                  }
                }

                await BusinessProfile.findByIdAndUpdate(
                  businessProfile._id,
                  {
                    $set: {
                      subscriptionTier: plan.id as "free" | "starter" | "growth",
                      aiCreditsRemaining: creditsForPlan,
                      aiCreditsTotal: creditsForPlan,
                      subscriptionStatus: "active",
                      ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
                      ...(subscriptionPeriodEnd && { subscriptionCurrentPeriodEnd: subscriptionPeriodEnd }),
                    },
                  },
                  { session: dbSession }
                );
              }

              // Update User model for backward compatibility
              await User.updateOne(
                { emailAddress: customer.email },
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
                { session: dbSession }
              );

              // Create payment history record for subscription
              await createStripePaymentHistory(
                user.id,
                {
                  paymentIntentId: checkoutSession.id?.toString() || "unknown", // Use session ID as payment intent ID
                  customerId: customerId,
                  amount: 0, // Amount will be set from plan data
                  currency: "usd", // Default currency
                  planId: plan.id,
                  planName: plan.name,
                  planType: plan.type,
                  planPrice: plan.price,
                  isPremium: plan.popular || false,
                  creditsAllocated: plan.isFreeCredits || 0,
                  billingEmail: customer.email || undefined,
                  billingName: customer.name || undefined,
                  subscriptionInterval: plan.billingCycle,
                  subscriptionStatus: "active",
                  webhookData: checkoutSession as unknown as Record<string, unknown>,
                },
                "succeeded",
                dbSession
              );

              return { user, plan, checkoutSession, businessProfile };
            },
            // External API operations
            async (dbResult) => {
              // Update Clerk user metadata with plan information
              await (
                await clerkClient()
              ).users.updateUser(dbResult.user.id, {
                privateMetadata: {
                  plan: dbResult.plan.name,
                  oneTimePayment: {
                    priceId: priceId,
                    paymentDate: new Date().toISOString(),
                    paymentAmount: dbResult.checkoutSession.amount_subtotal,
                    sessionId: dbResult.checkoutSession.id,
                  },
                },
                publicMetadata: {
                  plan: dbResult.plan.name,
                },
              });
            }
          );

          logger.info("User successfully upgraded to new plan", {
            userId: user.id,
            planName: plan.name,
            planType: plan.type,
            creditsAdded: plan.isFreeCredits || 0
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Handle subscription cancellations
        const subscription = await stripe.subscriptions.retrieve(
          (data.object as { id: string }).id
        );
        const customerId = subscription.customer as string;
        
        const customer = await stripe.customers.retrieve(customerId);
        if (!("email" in customer) || !customer.email) {
          logger.error("Customer record missing email for subscription deletion", undefined, { 
            customerId,
            subscriptionId: subscription.id 
          });
          return NextResponse.json({ error: "Invalid customer data" }, { status: 400 });
        }

        const user = await User.findOne({ emailAddress: customer.email });
        if (!user) {
          logger.error("User not found for subscription cancellation", undefined, { 
            customerId,
            subscriptionId: subscription.id 
          });
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Find BusinessProfile
        const businessProfile = await BusinessProfile.findOne({ userId: user._id });
        
        // Reset user's plan to free tier with transaction and external API call
        await withTransactionAndExternal(
          // Database operations
          async (session) => {
            // Update BusinessProfile to free tier
            if (businessProfile) {
              const currentDate = new Date();
              await BusinessProfile.findByIdAndUpdate(
                businessProfile._id,
                {
                  $set: {
                    subscriptionTier: "free",
                    aiCreditsRemaining: 3,
                    aiCreditsTotal: 3,
                    subscriptionStatus: "canceled",
                    lastCreditReset: currentDate,
                    creditResetDay: currentDate.getDate(),
                    stripeSubscriptionId: null,
                    subscriptionCurrentPeriodEnd: null,
                  },
                },
                { session }
              );
            }

            // Update User model for backward compatibility
            await User.updateOne(
              { emailAddress: customer.email },
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

            return { user, businessProfile };
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

        logger.info("Subscription successfully canceled, user downgraded to free plan", {
          userId: user.id,
          businessProfileId: businessProfile?._id,
          subscriptionId: subscription.id
        });
        break;
      }

      case "invoice.payment_failed": {
        // Handle failed payment attempts
        const stripeInvoice = data.object as Stripe.Invoice;
        
        if (!stripeInvoice.customer) {
          logger.warn("Invoice payment failed event missing customer ID", { invoiceId: stripeInvoice.id });
          break;
        }

        const customer = await stripe.customers.retrieve(
          stripeInvoice.customer as string
        );
        
        if (!("email" in customer) || !customer.email) {
          logger.warn("Customer record missing email for payment failure", { 
            invoiceId: stripeInvoice.id,
            customerId: stripeInvoice.customer 
          });
          break;
        }

        const user = await User.findOne({ emailAddress: customer.email });
        if (!user) {
          logger.warn("User not found for payment failure", { 
            invoiceId: stripeInvoice.id,
            customerEmail: customer.email 
          });
          break;
        }

        // Update BusinessProfile subscription status to past_due
        const businessProfile = await BusinessProfile.findOne({ userId: user._id });
        if (businessProfile) {
          await BusinessProfile.findByIdAndUpdate(
            businessProfile._id,
            {
              $set: {
                subscriptionStatus: "past_due",
              },
            }
          );

          logger.info("Subscription marked as past_due due to payment failure", {
            userId: user.id,
            businessProfileId: businessProfile._id,
            invoiceId: stripeInvoice.id,
          });
        }

        // Optionally send notification email (can be implemented later)
        break;
      }

      default:
        logger.warn("Received unhandled webhook event type", { eventType });
        break;
    }
  } catch (err: any) {
    const error = err as Error;
    logger.error(`Error processing webhook event`, error, { eventType });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
});
