/**
 * PAYMENT PROVIDER CONFIGURATION
 * Choose your preferred payment provider: "stripe", "lemonsqueezy", or "webxpay"
 * Make sure to configure the corresponding environment variables
 */
export const paymentProvider: "stripe" | "lemonsqueezy" | "webxpay" = "lemonsqueezy";

/**
 * CURRENCY CONFIGURATION
 * Default currency for all pricing plans
 */
export const DEFAULT_CURRENCY = "usd";
export const DEFAULT_CURRENCY_SYMBOL = "$";

/**
 * Interface defining the structure for pricing plans
 * This interface ensures consistency across all pricing plans
 */
export interface PricingPlanTypes {
  /** Unique identifier for the plan */
  id: string;
  /** Display name of the pricing plan */
  name: string;
  /** Type of payment: one-time payment or recurring subscription */
  type: "payment" | "subscription";
  /** Price in decimal format (e.g., "9.99") for display */
  price: string;
  /** Currency code (e.g., "usd", "eur") */
  currency: string;
  /** Currency symbol for display (e.g., "$", "€") */
  currencySymbol?: string;
  /** Billing frequency for subscriptions (e.g., "monthly", "yearly") */
  billingCycle?: string;
  /** Stripe price ID from your Stripe dashboard */
  priceId: string;
  /** Lemon Squeezy variant ID from your Lemon Squeezy dashboard */
  variantId?: string;
  /** List of features included in this plan */
  features: {
    /** Whether this feature is included/active */
    active: boolean;
    /** Description of the feature */
    title: string;
  }[];
  /** Whether this plan should be highlighted as popular */
  popular?: boolean;
  /** Optional external link for the plan */
  link?: string;
  /** Short description of the plan */
  description?: string;
  /** Trial period in days (for subscriptions) */
  trial?: number;
  /** Number of free credits included with this plan */
  isFreeCredits?: number;
  /** Custom text for the checkout button */
  displayButtonName?: string;
}

/**
 * PRICING PLANS CONFIGURATION
 * 
 * ⚠️  IMPORTANT: Update these values with your actual pricing plan details
 * 
 * How to configure:
 * 1. Update 'priceId' with your Stripe price IDs from Stripe Dashboard
 * 2. Update 'variantId' with your Lemon Squeezy variant IDs
 * 3. Modify features, pricing, and descriptions to match your product
 * 4. Set the 'popular' flag to highlight your recommended plan
 */
export const PricingPlans: PricingPlanTypes[] = [
  {
    id: "free",
    description: "Perfect for trying out ModelSnap.ai",
    name: "Free",
    type: "payment",
    price: "0",
    currency: "usd",
    currencySymbol: "$",
    billingCycle: "subscription",
    priceId: "",
    variantId: "",
    features: [
      {
        active: true,
        title: "3 AI-generated on-model photos per month",
      },
      {
        active: true,
        title: "Watermarked",
      },
      {
        active: true,
        title: "Access to AI model gallery",
      },
      {
        active: true,
        title: "Basic support",
      },
    ],
    popular: false,
    isFreeCredits: 3,
    displayButtonName: "Join Waitlist",
  },
  {
    id: "starter",
    description: "For small boutiques, Instagram sellers & designers",
    name: "Starter",
    type: "subscription",
    price: "19",
    currency: "usd",
    currencySymbol: "$",
    billingCycle: "monthly",
    priceId: "", // Replace with actual Stripe price ID
    variantId: "", // Replace with actual Lemon Squeezy variant ID
    features: [
      {
        active: true,
        title: "40 AI-generated on-model photos/month",
      },
      {
        active: true,
        title: "No watermarks",
      },
      {
        active: true,
        title: "Access to AI model gallery",
      },
      {
        active: true,
        title: "Access to Human Model Marketplace",
      },
      {
        active: true,
        title: "High-resolution downloads",
      },
      {
        active: true,
        title: "Email support",
      },
    ],
    popular: true,
    isFreeCredits: 40,
    displayButtonName: "Join Waitlist",
  },
  {
    id: "growth",
    description: "For manufacturers & fast-moving fashion brands",
    name: "Growth",
    type: "subscription",
    price: "49",
    currency: "usd",
    currencySymbol: "$",
    billingCycle: "monthly",
    priceId: "", // Replace with actual Stripe price ID
    variantId: "", // Replace with actual Lemon Squeezy variant ID
    features: [
      {
        active: true,
        title: "100 AI-generated on-model photos/month",
      },
      {
        active: true,
        title: "No watermarks",
      },
      {
        active: true,
        title: "Access to AI model gallery",
      },
      {
        active: true,
        title: "Access to Human Model Marketplace",
      },
      {
        active: true,
        title: "High-resolution downloads",
      },
      {
        active: true,
        title: "Priority support",
      }
    ],
    popular: false,
    isFreeCredits: 100,
    displayButtonName: "Join Waitlist",
  },
];

/**
 * CREDITS SYSTEM CONFIGURATION
 * 
 * Configure your credit-based pricing if your app uses a credit system
 * ⚠️  Update these values with your actual credit pricing
 */
export const Credits = {
  /** Number of free credits given to new users */
  freeCredits: 10,
  /** Price per individual credit (for reference/calculations) */
  perCreditPrice: "0.12",
  /** Available credit packages for purchase */
  plans: [
    {
      title: "50 Credits",
      price: "4.99",
      priceId: "", // Replace with actual Stripe price ID
      variantId: "", // Replace with actual Lemon Squeezy variant ID
      credits: 50,
    },
    {
      title: "100 Credits",
      price: "8.99",
      priceId: "", // Replace with actual Stripe price ID
      variantId: "", // Replace with actual Lemon Squeezy variant ID
      credits: 100,
    },
  ],
};

/**
 * FEATURE FLAGS
 */

/** 
 * Whether your application uses a credit-based system
 * Set to true if users need to spend credits for actions
 */
export const isUsedCredits = false;
