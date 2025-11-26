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

