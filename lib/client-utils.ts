import { PricingPlans } from "@/lib/config/pricing";

/**
 * Get credit limit for a given plan ID (client-safe)
 * @param planId - Plan identifier (e.g., "free", "starter", "growth")
 * @returns Number of credits for the plan
 */
export function getCreditsForPlan(planId: string): number {
  const plan = PricingPlans.find((p) => p.id === planId);
  return plan?.isFreeCredits || 3; // Default to 3 for free tier
}

