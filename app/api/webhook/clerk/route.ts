import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { Credits, paymentProvider } from "@/lib/config/pricing";
import { stripe } from "@/lib/stripe";
import {
  createCustomer,
  lemonSqueezySetup,
  updateCustomer,
  archiveCustomer,
  listCustomers,
} from "@lemonsqueezy/lemonsqueezy.js";
import { withTransaction, withTransactionAndExternal } from "@/lib/transaction-utils";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * Webhook endpoint to handle Clerk user events
 * Processes user.created, user.updated, and user.deleted events
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.WEBHOOK)(async (req: NextRequest) => {
  // Connect to MongoDB database
  await connectDB();

  // Verify webhook signing secret exists
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET!;
  if (!SIGNING_SECRET) {
    throw new Error("Error: SIGNING_SECRET missing from .env");
  }

  // Initialize Svix Webhook handler
  const wh = new Webhook(SIGNING_SECRET);

  // Extract required Svix headers
  const headerPayload: any = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Validate required headers are present
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error: Missing Svix headers", { status: 400 });
  }

  // Get and stringify request body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify webhook signature using Svix
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new NextResponse("Error: Verification error", { status: 400 });
  }

  const eventType = evt.type;

  // Route event to appropriate handler based on type
  try {
    console.log(`📨 Received webhook event: ${eventType}`);
    
    switch (eventType) {
      case "user.created":
        await handleUserCreated(evt.data);
        break;
      case "user.updated":
        await handleUserUpdated(evt.data);
        break;
      case "user.deleted":
        await handleUserDeleted(evt.data);
        break;
      default:
        console.log(`⚠️ Unhandled event type: ${eventType}`);
    }
    
    console.log(`✅ Successfully processed event: ${eventType}`);
    return new NextResponse("Webhook received", { status: 200 });
  } catch (error) {
    console.error(`❌ Error processing event ${eventType}:`, error);
    // Return 500 to let Clerk know the webhook failed (they will retry)
    return new NextResponse(
      JSON.stringify({ 
        error: "Error processing event", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

/**
 * Handles user.created event from Clerk
 * 1. Creates Stripe customer (if Stripe is configured)
 * 2. Creates LemonSqueezy customer (if LemonSqueezy is configured)
 * 3. Updates Clerk user with customer IDs
 * 4. Creates user record in MongoDB
 */
async function handleUserCreated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url } = data;

  let stripeCustomerId = null;
  let lemonCustomerId = null;

  if (paymentProvider === "stripe") {
    // Create new customer in Stripe if configured
    if (stripe) {
      const stripeCustomer = await stripe.customers.create({
        email: email_addresses[0].email_address,
        name: `${first_name} ${last_name}`,
        metadata: { id },
      });
      stripeCustomerId = stripeCustomer.id;
    }
  }

  if (paymentProvider === "lemonsqueezy") {
    // Create new customer in LemonSqueezy if configured
    if (process.env.LEMON_SQUEEZY_API_KEY) {
      try {
        // Setup Lemon Squeezy with API key
        lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

        // Get store ID from environment variable
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

        if (!storeId || isNaN(Number(storeId))) {
          console.error(
            "❌ LEMON_SQUEEZY_STORE_ID is not configured or invalid"
          );
        } else {
          const { data: exCustomer, error: exError } = await listCustomers({
            filter: {
              storeId: parseInt(storeId!),
              email: email_addresses[0].email_address,
            },
          });

          if (exCustomer?.data[0].id) {
            lemonCustomerId = exCustomer.data[0].id;
          } else {
            // Create customer in LemonSqueezy
            const { data: customerData, error } = await createCustomer(
              parseInt(storeId!),
              {
                name: `${first_name} ${last_name}`,
                email: email_addresses[0].email_address,
              }
            );

            if (error) {
              console.error("❌ Error creating LemonSqueezy customer:", error);
            } else if (customerData && customerData.data) {
              lemonCustomerId = customerData.data.id;
              console.log(
                "✅ LemonSqueezy customer created:",
                customerData.data.id
              );
            } else {
              console.error("❌ No customer data returned from LemonSqueezy");
            }
          }
        }
      } catch (error) {
        console.error(
          "❌ Error setting up LemonSqueezy or creating customer:",
          error
        );
      }
    }
  }

  // Check if user is admin via ADMIN_EMAILS
  let role = data.public_metadata?.role || data.privateMetadata?.role;
  
  if (!role) {
    // Check if email is in ADMIN_EMAILS
    const email = email_addresses[0]?.email_address;
    if (email) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
      if (adminEmails.includes(email)) {
        role = "ADMIN";
        console.log("🔑 User is admin via ADMIN_EMAILS:", email);
      } else {
        console.log("👤 Regular user signup, role will be null for onboarding:", email);
      }
    } else {
      console.log("👤 Regular user signup (no email), role will be null for onboarding");
    }
    // Don't set default role - let user choose in onboarding
    // role will be null/undefined, which will trigger onboarding flow
  } else {
    console.log("👤 User has existing role in metadata:", role);
  }

  try {
    // Check if user already exists (prevent duplicates)
    const existingUser = await User.findOne({ id });
    if (existingUser) {
      console.log(`⚠️ User ${id} already exists in database, skipping creation`);
      return;
    }

    // Update Clerk user and create MongoDB user atomically
    await withTransactionAndExternal(
      // Database operations
      async (session) => {
        console.log("📝 Creating user in MongoDB:", id);
        
        // Create new user document in MongoDB
        // Explicitly set role to null for new users (unless they're admin)
        const userData: any = {
          id,
          firstName: first_name || "",
          lastName: last_name || "",
          emailAddress: email_addresses.map((mail: any) => mail.email_address),
          picture: image_url || "",
          stripeCustomerId,
          lemonsqueezyCustomerId: lemonCustomerId,
          role: role || null, // Explicitly set to null if not admin
          plan: { planType: "free", id: "free" },
          credits: Credits.freeCredits,
        };
        
        const newUser = await User.create([userData], { session });
        console.log("✅ User created in MongoDB:", newUser[0]?._id, "with role:", newUser[0]?.role);
        return { id, stripeCustomerId, lemonCustomerId };
      },
      // External API operations
      async (dbResult) => {
        try {
          // Update Clerk user with Stripe or LemonSqueezy customer ID and initial plan
          await (
            await clerkClient()
          ).users.updateUser(dbResult.id, {
            privateMetadata: {
              stripeCustomerId: dbResult.stripeCustomerId,
              lemonCustomerId: dbResult.lemonCustomerId,
              plan: "free",
            },
          });
          console.log("✅ Clerk user metadata updated");
        } catch (clerkError) {
          console.error("❌ Error updating Clerk user metadata:", clerkError);
          // Don't throw - user is already created in DB
        }
      }
    );

    console.log(
      `✅ User created successfully: ${id} | Stripe ID: ${stripeCustomerId || "Not configured"} | LemonSqueezy ID: ${lemonCustomerId || "Not configured"}`
    );
  } catch (error) {
    console.error("❌ Error in handleUserCreated:", error);
    // Re-throw to ensure webhook returns error status
    throw error;
  }
}

/**
 * Handles user.updated event from Clerk
 * 1. Updates user details in MongoDB
 * 2. Updates customer name in Stripe (if configured)
 * 3. Updates customer name in LemonSqueezy (if configured)
 */
async function handleUserUpdated(data: any) {
  const { id, first_name, last_name, image_url, privateMetadata } = data;

  // Update user document in MongoDB
  const user = await User.findOneAndUpdate(
    { id },
    {
      firstName: first_name,
      lastName: last_name,
      picture: image_url,
    }
  );

  if (!user) {
    console.error(`User ${id} not found in database.`);
    return;
  }

  // Update customer name in Stripe if configured
  if (stripe && privateMetadata?.stripeCustomerId) {
    await stripe.customers.update(privateMetadata.stripeCustomerId, {
      name: `${first_name} ${last_name}`,
    });
  }

  // Update customer name in LemonSqueezy if configured
  if (
    paymentProvider === "lemonsqueezy" &&
    privateMetadata?.lemonCustomerId &&
    process.env.LEMON_SQUEEZY_API_KEY
  ) {
    try {
      // Setup Lemon Squeezy with API key
      lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

      // Update customer in LemonSqueezy
      const { error } = await updateCustomer(privateMetadata.lemonCustomerId, {
        name: `${first_name} ${last_name}`,
      });

      if (error) {
        console.error("❌ Error updating LemonSqueezy customer:", error);
      } else {
        console.log(
          "✅ LemonSqueezy customer updated:",
          privateMetadata.lemonCustomerId
        );
      }
    } catch (error) {
      console.error("❌ Error updating LemonSqueezy customer:", error);
    }
  }

  console.log(`🟡 User updated: ${id}`);
}

/**
 * Handles user.deleted event from Clerk
 * 1. Deletes user from MongoDB
 * 2. Deletes customer from Stripe (if configured)
 * 3. Archives customer in LemonSqueezy (if configured)
 */
async function handleUserDeleted(data: any) {
  const { id, privateMetadata } = data;

  // Delete user document from MongoDB and external services atomically
  await withTransactionAndExternal(
    // Database operations
    async (session) => {
      const user = await User.findOneAndDelete({ id }, { session });

      if (!user) {
        console.error(`User ${id} not found in database.`);
        throw new Error(`User ${id} not found in database.`);
      }

      return { user, privateMetadata };
    },
    // External API operations
    async (dbResult) => {
      // Delete customer from Stripe if configured
      if (stripe && dbResult.privateMetadata?.stripeCustomerId) {
        await stripe.customers.del(dbResult.privateMetadata.stripeCustomerId);
      }

      // Archive customer in LemonSqueezy if configured
      if (
        paymentProvider === "lemonsqueezy" &&
        dbResult.privateMetadata?.lemonCustomerId &&
        process.env.LEMON_SQUEEZY_API_KEY
      ) {
        try {
          // Setup Lemon Squeezy with API key
          lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

          // Archive customer in LemonSqueezy
          const { error } = await archiveCustomer(dbResult.privateMetadata.lemonCustomerId);

          if (error) {
            console.error("❌ Error archiving LemonSqueezy customer:", error);
          } else {
            console.log(
              "✅ LemonSqueezy customer archived:",
              dbResult.privateMetadata.lemonCustomerId
            );
          }
        } catch (error) {
          console.error("❌ Error archiving LemonSqueezy customer:", error);
        }
      }
    }
  );

  console.log(
    `🔴 User deleted: ${id} | Stripe ID: ${privateMetadata?.stripeCustomerId || "Not configured"} | LemonSqueezy ID: ${privateMetadata?.lemonCustomerId || "Not configured"}`
  );
}
