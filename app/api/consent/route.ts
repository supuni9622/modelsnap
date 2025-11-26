import { connectDB } from "@/lib/db";
import ConsentRequest from "@/models/consent-request";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import {
  sendConsentRequestEmail,
  sendConsentApprovedEmail,
  sendConsentRejectedEmail,
} from "@/lib/email-notifications";

/**
 * GET /api/consent
 * Get consent requests
 * For businesses: Get requests they've sent
 * For models: Get requests they've received
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "received"; // "sent" or "received"
    const status = searchParams.get("status"); // Optional filter by status

    let query: any = {};

    if (user.role === "MODEL") {
      // Models see requests they've received
      const modelProfile = await ModelProfile.findOne({ userId: user._id });
      if (!modelProfile) {
        return NextResponse.json(
          {
            status: "success",
            data: {
              requests: [],
              pagination: { total: 0, limit: 20, skip: 0, hasMore: false },
            },
          },
          { status: 200 }
        );
      }
      query.modelId = modelProfile._id;
    } else if (user.role === "BUSINESS" || !user.role) {
      // Businesses see requests they've sent
      const businessProfile = await BusinessProfile.findOne({ userId: user._id });
      if (!businessProfile) {
        return NextResponse.json(
          {
            status: "success",
            data: {
              requests: [],
              pagination: { total: 0, limit: 20, skip: 0, hasMore: false },
            },
          },
          { status: 200 }
        );
      }
      query.businessId = businessProfile._id;
    } else {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid user role",
          code: "INVALID_ROLE",
        },
        { status: 400 }
      );
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    const requests = await ConsentRequest.find(query)
      .populate("businessId", "businessName")
      .populate("modelId", "name referenceImages")
      .sort({ requestedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await ConsentRequest.countDocuments(query);

    return NextResponse.json(
      {
        status: "success",
        data: {
          requests,
          pagination: {
            total,
            limit,
            skip,
            hasMore: skip + limit < total,
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching consent requests:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch consent requests",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/consent
 * Create a new consent request
 * Only businesses can create consent requests
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
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

    // Get or create business profile
    let businessProfile = await BusinessProfile.findOne({ userId: user._id });
    if (!businessProfile) {
      // Create business profile if it doesn't exist
      businessProfile = await BusinessProfile.create({
        userId: user._id,
        businessName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "My Business",
        aiCredits: user.credits || 0,
        subscriptionStatus: user.plan?.type === "free" ? "FREE" : "STARTER",
        approvedModels: [],
      });

      // Update user role if needed
      if (user.role !== "BUSINESS") {
        await User.findOneAndUpdate({ id: userId }, { role: "BUSINESS" });
      }
    }

    // Parse request body
    const body = await req.json();
    const { modelId, message } = body;

    if (!modelId) {
      return NextResponse.json(
        {
          status: "error",
          message: "modelId is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Check if model exists
    const modelProfile = await ModelProfile.findById(modelId);
    if (!modelProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Model profile not found",
          code: "MODEL_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check if model is active
    if (modelProfile.status !== "active") {
      return NextResponse.json(
        {
          status: "error",
          message: "Model profile is not active",
          code: "MODEL_INACTIVE",
        },
        { status: 400 }
      );
    }

    // Check if consent already exists (one-time consent rule)
    const existingConsent = await ConsentRequest.findOne({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      status: "APPROVED",
    });

    if (existingConsent) {
      return NextResponse.json(
        {
          status: "error",
          message: "Consent already approved for this model",
          code: "CONSENT_EXISTS",
          data: existingConsent,
        },
        { status: 400 }
      );
    }

    // Check if there's a pending request
    const pendingRequest = await ConsentRequest.findOne({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      status: "PENDING",
    });

    if (pendingRequest) {
      return NextResponse.json(
        {
          status: "error",
          message: "Consent request already pending",
          code: "REQUEST_PENDING",
          data: pendingRequest,
        },
        { status: 400 }
      );
    }

    // Create consent request
    const consentRequest = await ConsentRequest.create({
      businessId: businessProfile._id,
      modelId: modelProfile._id,
      status: "PENDING",
      message: message || null,
      requestedAt: new Date(),
    });

    // Populate for response
    const populatedRequest = await ConsentRequest.findById(consentRequest._id)
      .populate("businessId", "businessName")
      .populate("modelId", "name referenceImages")
      .lean();

    // Send email notification to model
    try {
      const modelUser = await User.findById(modelProfile.userId);
      if (modelUser && modelUser.emailAddress && modelUser.emailAddress[0]) {
        await sendConsentRequestEmail(
          modelUser.emailAddress[0],
          modelProfile.name,
          businessProfile.businessName,
          consentRequest._id.toString()
        );
      }
    } catch (emailError) {
      console.error("Failed to send consent request email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Consent request created successfully",
        data: populatedRequest,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating consent request:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create consent request",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
});

