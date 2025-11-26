import mongoose, { Schema } from "mongoose";

/**
 * Invoice Schema
 * Stores invoice information from Stripe and other payment providers
 */
const InvoiceSchema = new Schema(
  {
    // User who owns the invoice
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Business profile (optional, for future use)
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "BusinessProfile",
    },

    // Stripe invoice ID
    stripeInvoiceId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // Lemon Squeezy order ID (for invoices)
    lemonsqueezyOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // Human-readable invoice number
    invoiceNumber: {
      type: String,
      index: true,
    },

    // Amount and currency
    amountDue: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "usd",
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "open", "paid", "uncollectible", "void"],
      required: true,
      index: true,
    },

    // URLs
    pdfUrl: {
      type: String,
      // Stripe-hosted PDF URL
    },

    hostedInvoiceUrl: {
      type: String,
      // Stripe-hosted invoice page URL
    },

    // Billing period
    periodStart: {
      type: Date,
    },

    periodEnd: {
      type: Date,
    },

    // Line items snapshot (optional)
    lineItems: [
      {
        description: String,
        amount: Number,
        quantity: Number,
      },
    ],

    // Payment confirmation
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
InvoiceSchema.index({ userId: 1, createdAt: -1 }); // User's invoice history
InvoiceSchema.index({ status: 1, createdAt: -1 }); // Status queries
InvoiceSchema.index({ stripeInvoiceId: 1 });
InvoiceSchema.index({ lemonsqueezyOrderId: 1 });

// Delete existing model if it exists to ensure fresh schema compilation
if (mongoose.models.Invoice) {
  delete mongoose.models.Invoice;
}

const Invoice = mongoose.model("Invoice", InvoiceSchema);

export default Invoice;

