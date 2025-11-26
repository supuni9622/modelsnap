import { PricingPlans } from "@/lib/config/pricing";
import BusinessProfile from "@/models/business-profile";
import CreditTransaction from "@/models/credit-transaction";
import { withTransaction } from "@/lib/transaction-utils";
import { connectDB } from "@/lib/db";

/**
 * Get credit limit for a given plan ID
 * @param planId - Plan identifier (e.g., "free", "starter", "growth")
 * @returns Number of credits for the plan
 */
export function getCreditsForPlan(planId: string): number {
  const plan = PricingPlans.find((p) => p.id === planId);
  return plan?.isFreeCredits || 3; // Default to 3 for free tier
}

/**
 * Reset free tier credits to 3
 * @param businessProfile - BusinessProfile document to reset
 */
export async function resetFreeTierCredits(
  businessProfile: InstanceType<typeof BusinessProfile>
): Promise<void> {
  await connectDB();

  await withTransaction(async (session) => {
    // Reset credits to 3
    await BusinessProfile.findByIdAndUpdate(
      businessProfile._id,
      {
        $set: {
          aiCreditsRemaining: 3,
          aiCreditsTotal: 3,
          lastCreditReset: new Date(),
        },
      },
      { session }
    );

    // Log credit reset transaction
    await CreditTransaction.create(
      [
        {
          userId: businessProfile.userId,
          type: "ADJUSTMENT",
          amount: 3,
          balanceAfter: 3,
          reason: "Monthly free tier credit reset",
          metadata: {
            subscriptionTier: "free",
            resetType: "monthly",
          },
        },
      ],
      { session }
    );
  });
}

/**
 * Check if 30 days have passed since last credit reset and reset if needed
 * @param businessProfile - BusinessProfile document to check
 * @returns true if credits were reset, false otherwise
 */
export async function checkAndResetFreeCredits(
  businessProfile: InstanceType<typeof BusinessProfile>
): Promise<boolean> {
  if (businessProfile.subscriptionTier !== "free") {
    return false; // Only reset for free tier
  }

  if (!businessProfile.lastCreditReset) {
    // Initialize if missing
    await BusinessProfile.findByIdAndUpdate(businessProfile._id, {
      $set: {
        lastCreditReset: new Date(),
        creditResetDay: new Date().getDate(),
      },
    });
    return false;
  }

  const now = new Date();
  const lastReset = new Date(businessProfile.lastCreditReset);
  const daysSinceReset = Math.floor(
    (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceReset >= 30) {
    await resetFreeTierCredits(businessProfile);
    return true;
  }

  return false;
}

/**
 * Deduct credits from a business profile
 * @param businessProfileId - BusinessProfile ID
 * @param amount - Amount of credits to deduct (default: 1)
 * @returns Updated BusinessProfile or null if insufficient credits
 */
export async function deductCredit(
  businessProfileId: string,
  amount: number = 1
): Promise<InstanceType<typeof BusinessProfile> | null> {
  await connectDB();

  let updatedProfile: InstanceType<typeof BusinessProfile> | null = null;

  await withTransaction(async (session) => {
    let profile = await BusinessProfile.findById(businessProfileId).session(
      session
    );

    if (!profile) {
      throw new Error("Business profile not found");
    }

    // Check and reset free tier credits if needed (within transaction)
    if (profile.subscriptionTier === "free" && profile.lastCreditReset) {
      const now = new Date();
      const lastReset = new Date(profile.lastCreditReset);
      const daysSinceReset = Math.floor(
        (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceReset >= 30) {
        // Reset credits within transaction
        await BusinessProfile.findByIdAndUpdate(
          businessProfileId,
          {
            $set: {
              aiCreditsRemaining: 3,
              aiCreditsTotal: 3,
              lastCreditReset: now,
            },
          },
          { session }
        );

        // Log credit reset transaction
        await CreditTransaction.create(
          [
            {
              userId: profile.userId,
              type: "ADJUSTMENT",
              amount: 3,
              balanceAfter: 3,
              reason: "Monthly free tier credit reset (on-demand)",
              metadata: {
                subscriptionTier: "free",
                resetType: "monthly",
              },
            },
          ],
          { session }
        );

        // Reload profile after reset
        profile = await BusinessProfile.findById(businessProfileId).session(
          session
        );
        if (!profile) {
          throw new Error("Business profile not found after reset");
        }
      }
    }

    // Check if sufficient credits
    if (profile.aiCreditsRemaining < amount) {
      return null;
    }

    // Deduct credits
    const newBalance = profile.aiCreditsRemaining - amount;
    await BusinessProfile.findByIdAndUpdate(
      businessProfileId,
      {
        $inc: { aiCreditsRemaining: -amount },
      },
      { session }
    );

    // Log credit transaction
    await CreditTransaction.create(
      [
        {
          userId: profile.userId,
          type: "GENERATION",
          amount: -amount,
          balanceAfter: newBalance,
          reason: `Credits deducted for generation (${amount} credit${amount > 1 ? "s" : ""})`,
          metadata: {
            subscriptionTier: profile.subscriptionTier,
            creditsBefore: profile.aiCreditsRemaining,
            creditsAfter: newBalance,
          },
        },
      ],
      { session }
    );

    updatedProfile = await BusinessProfile.findById(businessProfileId).session(
      session
    );
  });

  return updatedProfile;
}

/**
 * Check if a business can generate images
 * @param businessProfile - BusinessProfile document to check
 * @returns Object with can (boolean) and optional reason (string)
 */
export async function canGenerate(
  businessProfile: InstanceType<typeof BusinessProfile>
): Promise<{ can: boolean; reason?: string }> {
  // Check subscription status
  if (businessProfile.subscriptionStatus === "past_due") {
    return {
      can: false,
      reason: "Subscription payment is past due. Please update your payment method.",
    };
  }

  // Check if subscription is canceled
  if (businessProfile.subscriptionStatus === "canceled") {
    return {
      can: false,
      reason: "Subscription has been canceled. Please reactivate your subscription.",
    };
  }

  // Check and reset free tier credits if needed
  if (businessProfile.subscriptionTier === "free") {
    await checkAndResetFreeCredits(businessProfile);
    // Reload profile to get updated credits
    const refreshed = await BusinessProfile.findById(businessProfile._id);
    if (refreshed) {
      Object.assign(businessProfile, refreshed);
    }
  }

  // Check if sufficient credits
  if (businessProfile.aiCreditsRemaining < 1) {
    return {
      can: false,
      reason:
        businessProfile.subscriptionTier === "free"
          ? "Insufficient credits. Credits reset monthly on your signup date."
          : "Insufficient credits. Upgrade your plan or wait for monthly renewal.",
    };
  }

  return { can: true };
}

