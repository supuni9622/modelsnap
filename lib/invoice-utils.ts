import Stripe from "stripe";
import Invoice from "@/models/invoice";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import { stripe } from "@/lib/stripe";

/**
 * Create or update an invoice from Stripe invoice data
 */
export async function createOrUpdateInvoiceFromStripe(
  stripeInvoice: Stripe.Invoice,
  userId: string
) {
  // Get user
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new Error("User not found");
  }

  // Get business profile if exists
  const businessProfile = await BusinessProfile.findOne({ userId: user._id });

  // Extract line items
  const lineItems = stripeInvoice.lines.data.map((line) => ({
    description: line.description || "Subscription",
    amount: line.amount || 0,
    quantity: line.quantity || 1,
  }));

  // Create or update invoice
  const invoice = await Invoice.findOneAndUpdate(
    { stripeInvoiceId: stripeInvoice.id },
    {
      userId: user._id,
      businessId: businessProfile?._id,
      stripeInvoiceId: stripeInvoice.id,
      invoiceNumber: stripeInvoice.number || `INV-${stripeInvoice.id.slice(-8).toUpperCase()}`,
      amountDue: stripeInvoice.amount_due,
      currency: stripeInvoice.currency,
      status: stripeInvoice.status || "draft",
      pdfUrl: stripeInvoice.invoice_pdf || undefined,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || undefined,
      periodStart: stripeInvoice.period_start
        ? new Date(stripeInvoice.period_start * 1000)
        : undefined,
      periodEnd: stripeInvoice.period_end
        ? new Date(stripeInvoice.period_end * 1000)
        : undefined,
      lineItems,
      paidAt:
        stripeInvoice.status === "paid" && stripeInvoice.status_transitions?.paid_at
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
          : undefined,
    },
    { upsert: true, new: true, runValidators: true }
  );

  return invoice;
}

/**
 * Get Stripe invoice and create/update local invoice record
 */
export async function syncStripeInvoice(
  invoiceId: string,
  userId: string
) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const stripeInvoice = await stripe.invoices.retrieve(invoiceId);
  return createOrUpdateInvoiceFromStripe(stripeInvoice, userId);
}

/**
 * Create or update an invoice from Lemon Squeezy subscription invoice data
 * Used for subscription_payment_success webhook events
 */
export async function createOrUpdateInvoiceFromLemonSqueezySubscriptionInvoice(
  subscriptionInvoice: any,
  userId: string
) {
  // Get user
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new Error("User not found");
  }

  // Get business profile if exists
  const businessProfile = await BusinessProfile.findOne({ userId: user._id });

  const attributes = subscriptionInvoice.attributes || {};
  // Try to get order_id from attributes first
  let orderId = attributes.order_id ? String(attributes.order_id) : null;
  
  // If order_id is missing in attributes, check relationships (subscription invoice may have order relationship)
  if (!orderId && subscriptionInvoice.relationships?.order?.data?.id) {
    orderId = String(subscriptionInvoice.relationships.order.data.id);
    console.log("🔗 Found order ID from relationships:", orderId);
  }
  
  // If order_id is still missing, try to get it from business profile (stored by order_created)
  if (!orderId && businessProfile && (businessProfile as any).lastOrderId) {
    orderId = String((businessProfile as any).lastOrderId);
    console.log("🔗 Found order ID from business profile (stored by order_created):", orderId);
    // Clear the stored order ID after using it
    await BusinessProfile.findByIdAndUpdate(
      businessProfile._id,
      { $unset: { lastOrderId: "" } }
    );
  }
  
  // If order_id is still missing, try to find a very recent invoice for this user with matching amount
  // This handles the case where subscription_payment_success fires but order_id is not available
  // We use a 30-second window to ensure we only match invoices from the same transaction
  if (!orderId) {
    const total = attributes.total || attributes.total_usd || 0;
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    
    // Find the most recent invoice for this user with the same amount created within the last 30 seconds
    // This ensures we only match invoices from the current transaction, not old ones
    const recentInvoice = await Invoice.findOne({
      userId: user._id,
      amountDue: total,
      status: "paid",
      createdAt: { $gte: thirtySecondsAgo },
    }).sort({ createdAt: -1 });
    
    if (recentInvoice && recentInvoice.lemonsqueezyOrderId) {
      orderId = String(recentInvoice.lemonsqueezyOrderId);
      console.log("🔗 Found recent invoice for subscription payment, using order ID:", orderId);
    } else {
      // Since order_created skips invoice creation for subscriptions, we should use subscription invoice ID
      // This will create a new invoice with the subscription invoice ID as the order ID
      orderId = String(subscriptionInvoice.id);
      console.log("ℹ️ No recent matching invoice found (expected for subscriptions), using subscription invoice ID as orderId:", orderId);
    }
  } else {
    orderId = String(orderId);
  }
  
  const total = attributes.total || attributes.total_usd || 0;
  const currency = attributes.currency || "usd";
  const status = attributes.status === "paid" ? "paid" : "open";
  const productName = attributes.product_name || "Subscription";
  const variantName = attributes.variant_name || "";

  // Extract line items
  const lineItems = [
    {
      description: variantName ? `${productName} - ${variantName}` : productName,
      amount: total,
      quantity: 1,
    },
  ];

  // Create or update invoice
  const invoice = await Invoice.findOneAndUpdate(
    { lemonsqueezyOrderId: orderId },
    {
      userId: user._id,
      businessId: businessProfile?._id,
      lemonsqueezyOrderId: orderId,
      invoiceNumber: `INV-${orderId}`,
      amountDue: total,
      currency: currency.toLowerCase(),
      status: status,
      lineItems,
      paidAt: status === "paid" && attributes.created_at
        ? new Date(attributes.created_at)
        : undefined,
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log("✅ Created/updated invoice from Lemon Squeezy subscription invoice:", {
    invoiceId: invoice._id,
    orderId,
    amountDue: total,
    status,
  });

  return invoice;
}

/**
 * Create or update an invoice from Lemon Squeezy order data
 * Used for order_created webhook events
 */
export async function createOrUpdateInvoiceFromLemonSqueezyOrder(
  order: any,
  userId: string
) {
  // Get user
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new Error("User not found");
  }

  // Get business profile if exists
  const businessProfile = await BusinessProfile.findOne({ userId: user._id });

  const attributes = order.attributes || {};
  const orderId = String(order.id);
  const total = attributes.total || attributes.total_usd || 0;
  const currency = attributes.currency || "usd";
  const status = attributes.status === "paid" ? "paid" : "open";
  const firstOrderItem = attributes.first_order_item;

  // Extract line items
  const lineItems = firstOrderItem
    ? [
        {
          description:
            firstOrderItem.product_name && firstOrderItem.variant_name
              ? `${firstOrderItem.product_name} - ${firstOrderItem.variant_name}`
              : firstOrderItem.product_name || "Order",
          amount: total,
          quantity: firstOrderItem.quantity || 1,
        },
      ]
    : [
        {
          description: "Order",
          amount: total,
          quantity: 1,
        },
      ];

  // Create or update invoice
  const invoice = await Invoice.findOneAndUpdate(
    { lemonsqueezyOrderId: orderId },
    {
      userId: user._id,
      businessId: businessProfile?._id,
      lemonsqueezyOrderId: orderId,
      invoiceNumber: `INV-${orderId}`,
      amountDue: total,
      currency: currency.toLowerCase(),
      status: status,
      lineItems,
      paidAt: status === "paid" && attributes.created_at
        ? new Date(attributes.created_at)
        : undefined,
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log("✅ Created/updated invoice from Lemon Squeezy order:", {
    invoiceId: invoice._id,
    orderId,
    amountDue: total,
    status,
  });

  return invoice;
}

