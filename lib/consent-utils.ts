import { connectDB } from "@/lib/db";
import ConsentRequest from "@/models/consent-request";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";

/**
 * Check if a business has consent to use a specific model
 * Returns the consent request if approved, null otherwise
 */
export async function checkConsentStatus(
  businessUserId: string,
  modelId: string
): Promise<{
  hasConsent: boolean;
  consentRequest: any | null;
  message?: string;
}> {
  try {
    await connectDB();

    // Get business profile
    const businessUser = await User.findOne({ id: businessUserId });
    if (!businessUser) {
      return {
        hasConsent: false,
        consentRequest: null,
        message: "Business user not found",
      };
    }

    const businessProfile = await BusinessProfile.findOne({ userId: businessUser._id });
    if (!businessProfile) {
      return {
        hasConsent: false,
        consentRequest: null,
        message: "Business profile not found",
      };
    }

    // Check if model exists
    const modelProfile = await ModelProfile.findById(modelId);
    if (!modelProfile) {
      return {
        hasConsent: false,
        consentRequest: null,
        message: "Model profile not found",
      };
    }

    // Check if model is in approved list (fast path)
    const isApproved = businessProfile.approvedModels.some(
      (id: any) => id.toString() === modelId
    );

    if (isApproved) {
      // Find the consent request for reference
      const consentRequest = await ConsentRequest.findOne({
        businessId: businessProfile._id,
        modelId: modelProfile._id,
        status: "APPROVED",
      }).lean();

      return {
        hasConsent: true,
        consentRequest,
      };
    }

    // Check for pending request
    const pendingRequest = await ConsentRequest.findOne({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      status: "PENDING",
    }).lean();

    if (pendingRequest) {
      return {
        hasConsent: false,
        consentRequest: pendingRequest,
        message: "Consent request is pending approval",
      };
    }

    // Check for rejected request
    const rejectedRequest = await ConsentRequest.findOne({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      status: "REJECTED",
    }).lean();

    if (rejectedRequest) {
      return {
        hasConsent: false,
        consentRequest: rejectedRequest,
        message: "Consent request was rejected",
      };
    }

    // No consent request exists
    return {
      hasConsent: false,
      consentRequest: null,
      message: "Consent request not found. Please request consent first.",
    };
  } catch (error) {
    console.error("Error checking consent status:", error);
    return {
      hasConsent: false,
      consentRequest: null,
      message: "Error checking consent status",
    };
  }
}

/**
 * Get consent status for multiple models at once
 * Useful for marketplace browsing
 */
export async function checkMultipleConsentStatuses(
  businessUserId: string,
  modelIds: string[]
): Promise<Record<string, { hasConsent: boolean; status: string }>> {
  try {
    await connectDB();

    const businessUser = await User.findOne({ id: businessUserId });
    if (!businessUser) {
      return {};
    }

    const businessProfile = await BusinessProfile.findOne({ userId: businessUser._id });
    if (!businessProfile) {
      return {};
    }

    // Get all consent requests for these models
    const consentRequests = await ConsentRequest.find({
      businessId: businessProfile._id,
      modelId: { $in: modelIds },
    }).lean();

    // Create a map of modelId -> consent status
    const statusMap: Record<string, { hasConsent: boolean; status: string }> = {};

    for (const modelId of modelIds) {
      const isApproved = businessProfile.approvedModels.some(
        (id: any) => id.toString() === modelId
      );

      if (isApproved) {
        statusMap[modelId] = { hasConsent: true, status: "APPROVED" };
      } else {
        const request = consentRequests.find(
          (r) => r.modelId.toString() === modelId
        );
        if (request) {
          statusMap[modelId] = {
            hasConsent: false,
            status: request.status,
          };
        } else {
          statusMap[modelId] = { hasConsent: false, status: "NO_REQUEST" };
        }
      }
    }

    return statusMap;
  } catch (error) {
    console.error("Error checking multiple consent statuses:", error);
    return {};
  }
}

