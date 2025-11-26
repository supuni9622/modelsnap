import { connectDB } from "@/lib/db";
import ConsentRequest from "@/models/consent-request";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import {
  sendConsentApprovedEmail,
  sendConsentRejectedEmail,
} from "@/lib/email-notifications";

/**
 * GET /api/consent/[id]
 * Get a single consent request by ID
 * Only the business or model involved can view the request
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    try {
      await connectDB();
      const { id } = await params;

      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          {
            status: "error",
            message: "Unauthorized",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      const user = await User.findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          {
            status: "error",
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Fetch consent request with populated fields
      const consentRequest = await ConsentRequest.findById(id)
        .populate("businessId", "businessName businessType website description")
        .populate("modelId", "name referenceImages")
        .lean();

      if (!consentRequest) {
        return NextResponse.json(
          {
            status: "error",
            message: "Consent request not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Verify user has permission to view this request
      let hasPermission = false;

      // Type assertion for populated fields
      const request = consentRequest as any;

      if (user.role === "MODEL") {
        const modelProfile = await ModelProfile.findOne({ userId: user._id });
        const modelId = request.modelId?._id || request.modelId;
        if (modelProfile && modelId && modelProfile._id.toString() === modelId.toString()) {
          hasPermission = true;
        }
      } else if (user.role === "BUSINESS") {
        const businessProfile = await BusinessProfile.findOne({ userId: user._id });
        const businessId = request.businessId?._id || request.businessId;
        if (businessProfile && businessId && businessProfile._id.toString() === businessId.toString()) {
          hasPermission = true;
        }
      } else if (user.role === "ADMIN") {
        hasPermission = true;
      }

      if (!hasPermission) {
        return NextResponse.json(
          {
            status: "error",
            message: "Unauthorized to view this consent request",
            code: "UNAUTHORIZED",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          status: "success",
          data: consentRequest,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("Error fetching consent request:", err);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to fetch consent request",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

/**
 * PUT /api/consent/[id]
 * Update consent request status (approve/reject)
 * Only models can approve/reject requests
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    try {
      await connectDB();
      const { id } = await params;

      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          {
            status: "error",
            message: "Unauthorized",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      const user = await User.findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          {
            status: "error",
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Only models can approve/reject consent requests
      if (user.role !== "MODEL") {
        return NextResponse.json(
          {
            status: "error",
            message: "Only models can approve or reject consent requests",
            code: "INVALID_ROLE",
          },
          { status: 403 }
        );
      }

      const modelProfile = await ModelProfile.findOne({ userId: user._id });
      if (!modelProfile) {
        return NextResponse.json(
          {
            status: "error",
            message: "Model profile not found",
            code: "MODEL_PROFILE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Verify this request belongs to this model
      const consentRequest = await ConsentRequest.findById(id);
      if (!consentRequest) {
        return NextResponse.json(
          {
            status: "error",
            message: "Consent request not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (consentRequest.modelId.toString() !== modelProfile._id.toString()) {
        return NextResponse.json(
          {
            status: "error",
            message: "Unauthorized to modify this consent request",
            code: "UNAUTHORIZED",
          },
          { status: 403 }
        );
      }

      // Parse request body
      const body = await req.json();
      const { status } = body;

      if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        return NextResponse.json(
          {
            status: "error",
            message: "Invalid status. Must be APPROVED or REJECTED",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Check if request is already processed
      if (consentRequest.status !== "PENDING") {
        return NextResponse.json(
          {
            status: "error",
            message: "Consent request has already been processed",
            code: "ALREADY_PROCESSED",
          },
          { status: 400 }
        );
      }

      // Update consent request
      const updateData: any = {
        status,
      };

      if (status === "APPROVED") {
        updateData.grantedAt = new Date();
      } else if (status === "REJECTED") {
        updateData.rejectedAt = new Date();
      }

      const updatedRequest = await ConsentRequest.findByIdAndUpdate(id, updateData, {
        new: true,
      })
        .populate("businessId", "businessName businessType website description userId")
        .populate("modelId", "name referenceImages")
        .lean();

      // If approved, add business to model's approved businesses list
      if (status === "APPROVED") {
        await ModelProfile.findByIdAndUpdate(modelProfile._id, {
          $addToSet: { approvedBusinesses: consentRequest.businessId },
        });
      }

      // Send email notification
      try {
        const businessProfile = await BusinessProfile.findById(consentRequest.businessId);
        if (businessProfile) {
          const businessUser = await User.findById(businessProfile.userId);
          if (businessUser && businessUser.emailAddress && businessUser.emailAddress[0]) {
            if (status === "APPROVED") {
              await sendConsentApprovedEmail(
                businessUser.emailAddress[0],
                businessProfile.businessName,
                modelProfile.name
              );
            } else {
              await sendConsentRejectedEmail(
                businessUser.emailAddress[0],
                businessProfile.businessName,
                modelProfile.name
              );
            }
          }
        }
      } catch (emailError) {
        console.error("Failed to send consent status email:", emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json(
        {
          status: "success",
          message: `Consent request ${status.toLowerCase()} successfully`,
          data: updatedRequest,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("Error updating consent request:", err);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to update consent request",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}
