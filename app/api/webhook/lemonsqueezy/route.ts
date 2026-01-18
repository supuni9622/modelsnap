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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:127',message:'subscription_payment_success handler entry',data:{eventType:'subscription_payment_success',hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:145',message:'subscription_payment_success user found',data:{userFound:!!user,userId:user?.id,userPlanId:user?.plan?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:175',message:'subscription_payment_success variantId from payload',data:{variantId,variantIdString:String(variantId),hasVariantId:!!variantId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        // If not in webhook payload, fetch from API
        if (!variantId && subscriptionId) {
          console.log("⚠️ Fetching subscription from Lemon Squeezy:", subscriptionId);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:180',message:'subscription_payment_success before API call',data:{subscriptionId:String(subscriptionId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          try {
            const { data: subscriptionData, error: subError } = await getSubscription(String(subscriptionId));
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:183',message:'subscription_payment_success after API call',data:{hasError:!!subError,hasData:!!subscriptionData?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
            if (!subError && subscriptionData?.data) {
              const subscription = subscriptionData.data;
              // Try variant_id from attributes first, then first_subscription_item
              variantId = subscription.attributes.variant_id || 
                         (subscription.attributes.first_subscription_item as any)?.variant_id;
              console.log("🔍 Fetched subscription, variantId:", variantId);
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:190',message:'subscription_payment_success variantId from API',data:{variantId,variantIdString:String(variantId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
              // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:198',message:'subscription_payment_success plan lookup',data:{planFound:!!plan,planId:plan?.id,planName:plan?.name,variantId:String(variantId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:210',message:'subscription_payment_success fallback to BusinessProfile',data:{hasBusinessProfile:!!businessProfile,currentTier:businessProfile?.subscriptionTier},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:225',message:'subscription_payment_success fallback to user.plan (WARNING)',data:{planId:plan?.id,userPlanId:user.plan.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:241',message:'subscription_payment_success before transaction',data:{planId:plan.id,planName:plan.name,planCredits:plan.isFreeCredits||0,subscriptionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion

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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:250',message:'subscription_payment_success user update data',data:userUpdateData,timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          const updateResult = await User.updateOne(
            { id: user.id },
            { $set: userUpdateData },
            { session }
          );
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:264',message:'subscription_payment_success user update result',data:{matched:updateResult.matchedCount,modified:updateResult.modifiedCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
          // #endregion

          console.log("✅ User update result:", {
            matched: updateResult.matchedCount,
            modified: updateResult.modifiedCount,
          });

          // Get or create BusinessProfile
          let businessProfile = await BusinessProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user._id) 
          }).session(session);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:272',message:'subscription_payment_success businessProfile before update',data:{found:!!businessProfile,currentTier:businessProfile?.subscriptionTier,currentCredits:businessProfile?.aiCreditsRemaining},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
          // #endregion

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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:278',message:'subscription_payment_success businessProfile update data',data:businessUpdateData,timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
            const businessUpdateResult = await BusinessProfile.findByIdAndUpdate(
              businessProfile._id,
              { $set: businessUpdateData },
              { session, new: true }
            );
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:292',message:'subscription_payment_success businessProfile after update',data:{subscriptionTier:businessUpdateResult?.subscriptionTier,aiCreditsRemaining:businessUpdateResult?.aiCreditsRemaining,subscriptionStatus:businessUpdateResult?.subscriptionStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:325',message:'subscription_payment_success transaction completed',data:{planId:plan.id,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        // Verify the update actually persisted
        const verifyBusinessProfile = await BusinessProfile.findOne({ 
          userId: new mongoose.Types.ObjectId(user._id) 
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:330',message:'subscription_payment_success database verification',data:{subscriptionTier:verifyBusinessProfile?.subscriptionTier,aiCreditsRemaining:verifyBusinessProfile?.aiCreditsRemaining,subscriptionStatus:verifyBusinessProfile?.subscriptionStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion

        console.log(`✅ Subscription payment processed successfully`, {
          userId: user.id,
          planId: plan.id,
          planName: plan.name,
          creditsSet: plan.isFreeCredits || 0,
        });
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:492',message:'before transaction - plan determined',data:{planId:plan.id,planName:plan.name,planCredits:plan.isFreeCredits||0,subscriptionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
        // #endregion

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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:500',message:'user update data being set',data:userUpdateData,timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
          // #endregion
          const updateResult = await User.updateOne(
            { id: user.id },
            { $set: userUpdateData },
            { session }
          );
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:515',message:'user update result',data:{matched:updateResult.matchedCount,modified:updateResult.modifiedCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
          // #endregion

          console.log("✅ User update result:", {
            matched: updateResult.matchedCount,
            modified: updateResult.modifiedCount,
          });

          // Get or create BusinessProfile
          let businessProfile = await BusinessProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user._id) 
          }).session(session);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:523',message:'businessProfile before update',data:{found:!!businessProfile,currentTier:businessProfile?.subscriptionTier,currentCredits:businessProfile?.aiCreditsRemaining},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
          // #endregion

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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:531',message:'businessProfile update data being set',data:businessUpdateData,timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
            // #endregion
            const businessUpdateResult = await BusinessProfile.findByIdAndUpdate(
              businessProfile._id,
              { $set: businessUpdateData },
              { session, new: true }
            );
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:543',message:'businessProfile after update (in transaction)',data:{businessId:businessUpdateResult?._id?.toString(),subscriptionTier:businessUpdateResult?.subscriptionTier,aiCreditsRemaining:businessUpdateResult?.aiCreditsRemaining,subscriptionStatus:businessUpdateResult?.subscriptionStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
            // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:576',message:'transaction completed - verifying database',data:{planId:plan.id,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        
        // Verify the update actually persisted to database
        const verifyBusinessProfile = await BusinessProfile.findOne({ 
          userId: new mongoose.Types.ObjectId(user._id) 
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d76de0d5-92ce-4c87-bc8d-680f197c00a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhook/lemonsqueezy/route.ts:580',message:'database verification after transaction',data:{subscriptionTier:verifyBusinessProfile?.subscriptionTier,aiCreditsRemaining:verifyBusinessProfile?.aiCreditsRemaining,subscriptionStatus:verifyBusinessProfile?.subscriptionStatus,lemonsqueezySubscriptionId:verifyBusinessProfile?.lemonsqueezySubscriptionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
        // #endregion

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