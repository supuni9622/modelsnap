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
 * Get a specific consent request by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    const { id } = await params;
    try {
      await connectDB();

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

      const requestId = id;
    const user = await User.findOne({ id: userId });

    const consentRequestRaw = await ConsentRequest.findById(requestId)
      .populate("businessId", "businessName")
      .populate("modelId", "name referenceImages")
      .lean()
      .exec();

    if (!consentRequestRaw) {
      return NextResponse.json(
        {
          status: "error",
          message: "Consent request not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Type assertion - findById returns a single document, not an array
    const consentRequest = consentRequestRaw as any;

    // Check authorization - user must be the business or model owner
    if (user) {
      const businessProfile = await BusinessProfile.findOne({ userId: user._id });
      const modelProfile = await ModelProfile.findOne({ userId: user._id });
      const isBusinessOwner =
        businessProfile &&
        consentRequest.businessId?.toString() === businessProfile._id.toString();
      const isModelOwner =
        modelProfile && consentRequest.modelId?.toString() === modelProfile._id.toString();
      const isAdmin = user.role === "ADMIN";

      if (!isBusinessOwner && !isModelOwner && !isAdmin) {
        return NextResponse.json(
          {
            status: "error",
            message: "Forbidden",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }
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
 * Only the model owner can approve/reject
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    const { id } = await params;
    try {
      await connectDB();

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

      const requestId = id;
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

    // Find consent request
    const consentRequest = await ConsentRequest.findById(requestId);
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

    // Check if user is the model owner
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

    // Verify this request is for this model
    if (consentRequest.modelId.toString() !== modelProfile._id.toString()) {
      return NextResponse.json(
        {
          status: "error",
          message: "Forbidden - This request is not for your model",
          code: "FORBIDDEN",
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
          message: "Status must be 'APPROVED' or 'REJECTED'",
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
          message: `Consent request is already ${consentRequest.status}`,
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

    const updatedRequest = await ConsentRequest.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true }
    )
      .populate("businessId", "businessName")
      .populate("modelId", "name referenceImages")
      .lean();

    // If approved, add business to model's approved businesses list
    if (status === "APPROVED") {
      await ModelProfile.findByIdAndUpdate(modelProfile._id, {
        $addToSet: { approvedBusinesses: consentRequest.businessId },
      });

      // Add model to business's approved models list
      await BusinessProfile.findByIdAndUpdate(consentRequest.businessId, {
        $addToSet: { approvedModels: modelProfile._id },
      });
    }

    // Send email notification to business
    try {
      const businessProfileDoc = await BusinessProfile.findById(
        consentRequest.businessId
      );
      const businessUser = businessProfileDoc
        ? await User.findById(businessProfileDoc.userId)
        : null;

      if (businessUser && businessUser.emailAddress && businessUser.emailAddress[0]) {
        if (status === "APPROVED") {
          await sendConsentApprovedEmail(
            businessUser.emailAddress[0],
            businessProfileDoc?.businessName || "Business",
            modelProfile.name
          );
        } else {
          await sendConsentRejectedEmail(
            businessUser.emailAddress[0],
            businessProfileDoc?.businessName || "Business",
            modelProfile.name
          );
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

