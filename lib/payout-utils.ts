import { connectDB } from "@/lib/db";
import PayoutRequest from "@/models/payout-request";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { withTransaction } from "@/lib/transaction-utils";
import {
  sendPayoutApprovedEmail,
  sendPayoutCompletedEmail,
  sendPayoutFailedEmail,
} from "@/lib/email-notifications";

/**
 * Create a payout request with proper validation and balance checks
 */
export async function createPayoutRequest(
  userId: string,
  modelId: string,
  amount: number,
  paymentMethod: string,
  accountDetails: any
): Promise<{ success: boolean; payoutRequest?: any; error?: string }> {
  await connectDB();

  const user = await User.findOne({ id: userId });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const modelProfile = await ModelProfile.findById(modelId);
  if (!modelProfile) {
    return { success: false, error: "Model profile not found" };
  }

  // Validate amount (convert to cents)
  const amountInCents = Math.round(amount * 100);
  const MIN_PAYOUT_CENTS = 1000; // $10.00

  if (amountInCents < MIN_PAYOUT_CENTS) {
    return {
      success: false,
      error: `Minimum payout amount is $${MIN_PAYOUT_CENTS / 100}`,
    };
  }

  if (modelProfile.royaltyBalance < amount) {
    return {
      success: false,
      error: "Insufficient balance",
    };
  }

  // Create payout request atomically
  try {
    const result = await withTransaction(async (session) => {
      // Create payout request
      const payoutRequest = await PayoutRequest.create(
        [
          {
            modelId: modelProfile._id,
            userId: user._id,
            amount: amountInCents,
            currency: "USD",
            paymentMethod,
            accountDetails,
            status: "pending",
            netAmount: amountInCents, // Will be calculated after fees
          },
        ],
        { session }
      );

      // Reserve amount (deduct from balance, add to pending)
      modelProfile.royaltyBalance -= amount;
      modelProfile.pendingPayouts = (modelProfile.pendingPayouts || 0) + amount;

      await modelProfile.save({ session });

      // Add initial status to history
      payoutRequest[0].statusHistory.push({
        status: "pending",
        changedBy: user._id,
        changedAt: new Date(),
        reason: "Payout request created",
      });

      await payoutRequest[0].save({ session });

      return payoutRequest[0];
    });

    return { success: true, payoutRequest: result };
  } catch (error) {
    console.error("Error creating payout request:", error);
    return { success: false, error: "Failed to create payout request" };
  }
}

/**
 * Process a payout request (approve/reject/complete)
 */
export async function processPayoutRequest(
  payoutRequestId: string,
  action: "approve" | "reject" | "complete" | "fail",
  adminUserId: string,
  transactionId?: string,
  notes?: string,
  failureReason?: string
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  const adminUser = await User.findOne({ id: adminUserId });
  if (!adminUser || adminUser.role !== "ADMIN") {
    return { success: false, error: "Admin access required" };
  }

  const payoutRequest = await PayoutRequest.findById(payoutRequestId).populate("modelId");
  if (!payoutRequest) {
    return { success: false, error: "Payout request not found" };
  }

  const modelProfile = await ModelProfile.findById(payoutRequest.modelId);
  if (!modelProfile) {
    return { success: false, error: "Model profile not found" };
  }

  try {
    await withTransaction(async (session) => {
      if (action === "approve") {
        await payoutRequest.updateStatus(
          "approved",
          adminUser._id,
          "Payout approved by admin",
          notes
        );

        // Send email notification (outside transaction)
        const modelUser = await User.findById(modelProfile.userId);
        if (modelUser && modelUser.emailAddress?.[0]) {
          sendPayoutApprovedEmail(
            modelUser.emailAddress[0],
            modelProfile.name,
            payoutRequest.amount / 100,
            payoutRequest._id.toString()
          ).catch((err) => console.error("Failed to send payout approved email:", err));
        }
      } else if (action === "reject") {
        // Refund to balance
        modelProfile.royaltyBalance += payoutRequest.amount / 100;
        modelProfile.pendingPayouts = (modelProfile.pendingPayouts || 0) - payoutRequest.amount / 100;

        await payoutRequest.updateStatus(
          "rejected",
          adminUser._id,
          failureReason || "Payout rejected by admin",
          notes
        );

        await modelProfile.save({ session });
      } else if (action === "complete") {
        if (transactionId) {
          payoutRequest.transactionId = transactionId;
        }
        payoutRequest.processedBy = adminUser._id;
        payoutRequest.processedAt = new Date();

        // Deduct from pending
        modelProfile.pendingPayouts = (modelProfile.pendingPayouts || 0) - payoutRequest.amount / 100;
        if (modelProfile.pendingPayouts < 0) {
          modelProfile.pendingPayouts = 0;
        }

        await payoutRequest.updateStatus(
          "completed",
          adminUser._id,
          "Payout completed",
          notes
        );

        await modelProfile.save({ session });

        // Send email notification (outside transaction)
        const modelUser = await User.findById(modelProfile.userId);
        if (modelUser && modelUser.emailAddress?.[0]) {
          sendPayoutCompletedEmail(
            modelUser.emailAddress[0],
            modelProfile.name,
            payoutRequest.amount / 100,
            transactionId || payoutRequest.transactionId || "N/A",
            payoutRequest.paymentMethod || "N/A"
          ).catch((err) => console.error("Failed to send payout completed email:", err));
        }
      } else if (action === "fail") {
        // Refund to balance on failure
        modelProfile.royaltyBalance += payoutRequest.amount / 100;
        modelProfile.pendingPayouts = (modelProfile.pendingPayouts || 0) - payoutRequest.amount / 100;

        payoutRequest.failureReason = failureReason;
        payoutRequest.retryCount = (payoutRequest.retryCount || 0) + 1;
        payoutRequest.lastRetryAt = new Date();

        await payoutRequest.updateStatus(
          "failed",
          adminUser._id,
          failureReason || "Payout processing failed",
          notes
        );

        await modelProfile.save({ session });

        // Send email notification (outside transaction)
        const modelUser = await User.findById(modelProfile.userId);
        if (modelUser && modelUser.emailAddress?.[0]) {
          sendPayoutFailedEmail(
            modelUser.emailAddress[0],
            modelProfile.name,
            payoutRequest.amount / 100,
            payoutRequest._id.toString(),
            failureReason || "Payout processing failed"
          ).catch((err) => console.error("Failed to send payout failed email:", err));
        }
      }

      await payoutRequest.save({ session });
    });

    return { success: true };
  } catch (error) {
    console.error("Error processing payout:", error);
    return { success: false, error: "Failed to process payout" };
  }
}

/**
 * Get payout statistics for a model
 */
export async function getPayoutStats(modelId: string) {
  await connectDB();

  const [totalPaid, pendingAmount, completedCount, pendingCount] = await Promise.all([
    PayoutRequest.aggregate([
      { $match: { modelId, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    PayoutRequest.aggregate([
      { $match: { modelId, status: { $in: ["pending", "approved", "processing"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    PayoutRequest.countDocuments({ modelId, status: "completed" }),
    PayoutRequest.countDocuments({ modelId, status: { $in: ["pending", "approved", "processing"] } }),
  ]);

  return {
    totalPaid: (totalPaid[0]?.total || 0) / 100, // Convert from cents
    pendingAmount: (pendingAmount[0]?.total || 0) / 100,
    completedCount,
    pendingCount,
  };
}

