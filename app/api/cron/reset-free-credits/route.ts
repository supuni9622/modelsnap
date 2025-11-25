import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import BusinessProfile from "@/models/business-profile";
import { resetFreeTierCredits } from "@/lib/credit-utils";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "cron-reset-free-credits" });

/**
 * GET /api/cron/reset-free-credits
 * Cron job endpoint to reset free tier credits monthly
 * 
 * This endpoint should be called by Vercel Cron Jobs daily at midnight UTC.
 * It checks all free tier users and resets their credits if 30 days have passed.
 * 
 * Security: Should be protected by Vercel Cron secret or similar
 */
export const GET = async (req: NextRequest) => {
  try {
    // Optional: Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    logger.info("Starting free tier credit reset cron job");

    // Find all free tier business profiles
    const freeTierProfiles = await BusinessProfile.find({
      subscriptionTier: "free",
    });

    logger.info(`Found ${freeTierProfiles.length} free tier profiles to check`);

    let resetCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const profile of freeTierProfiles) {
      try {
        if (!profile.lastCreditReset) {
          // Initialize if missing
          await BusinessProfile.findByIdAndUpdate(profile._id, {
            $set: {
              lastCreditReset: new Date(),
              creditResetDay: new Date().getDate(),
            },
          });
          skippedCount++;
          continue;
        }

        const now = new Date();
        const lastReset = new Date(profile.lastCreditReset);
        const daysSinceReset = Math.floor(
          (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceReset >= 30) {
          await resetFreeTierCredits(profile);
          resetCount++;
          logger.info(`Reset credits for profile ${profile._id}`, {
            userId: profile.userId.toString(),
            daysSinceReset,
          });
        } else {
          skippedCount++;
        }
      } catch (error) {
        const err = error as Error;
        errors.push(`Profile ${profile._id}: ${err.message}`);
        logger.error(`Error resetting credits for profile ${profile._id}`, err);
      }
    }

    const summary = {
      totalProfiles: freeTierProfiles.length,
      resetCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    logger.info("Free tier credit reset cron job completed", summary);

    return NextResponse.json(
      {
        status: "success",
        message: "Free tier credit reset completed",
        ...summary,
      },
      { status: 200 }
    );
  } catch (error) {
    const err = error as Error;
    logger.error("Error in free tier credit reset cron job", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to reset free tier credits",
        error: err.message,
      },
      { status: 500 }
    );
  }
};

/**
 * POST /api/cron/reset-free-credits
 * Alternative endpoint for manual triggers (for testing)
 */
export const POST = GET;

