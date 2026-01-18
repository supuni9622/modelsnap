import { connectDB } from "@/lib/db";
import Feedback from "@/models/feedback";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { Credits } from "@/lib/config/pricing";

/**
 * GET endpoint to retrieve user data including billing, feedback and account info
 * @param req - Next.js request object
 * @returns Response with user's complete profile data or error if user not found
 */
export const GET = async (req: NextRequest) => {
  try {
    // Connect to database
    await connectDB();

    // Get authenticated user ID from Clerk
    const { userId } = await auth();

    // Return 401 if not authenticated
    if (!userId) {
      return Response.json(
        {
          status: "error",
          message: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Find user document in database
    let user = await User.findOne({ id: userId });

    // If user not found, try to create them (fallback if webhook failed)
    if (!user) {
      console.log(`⚠️ User ${userId} not found in database, attempting fallback creation`);
      
      try {
        // Fetch user from Clerk
        const { clerkClient } = await import("@clerk/nextjs/server");
        const clerkUser = await (await clerkClient()).users.getUser(userId);
        
        if (clerkUser) {
          // Get role from metadata - check if admin, otherwise null for onboarding
          let role = clerkUser.publicMetadata?.role || clerkUser.privateMetadata?.role;
          
          // Check if admin via ADMIN_EMAILS
          if (!role) {
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            if (email) {
              const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
              if (adminEmails.includes(email)) {
                role = "ADMIN";
              }
            }
          }
          
          // Create user in MongoDB - role is null for new users (unless admin)
          user = await User.create({
            id: userId,
            firstName: clerkUser.firstName || "",
            lastName: clerkUser.lastName || "",
            emailAddress: clerkUser.emailAddresses.map((email) => email.emailAddress),
            picture: clerkUser.imageUrl || "",
            role: role === "ADMIN" ? "ADMIN" : null, // Explicitly null for non-admins
            plan: { planType: "free", id: "free" },
            credits: Credits.freeCredits,
          });
          
          console.log(`✅ Fallback: User created in MongoDB: ${userId}`);
        }
      } catch (fallbackError) {
        console.error("❌ Fallback user creation failed:", fallbackError);
        // Continue to return 404 if fallback fails
      }
    }

    // Return 404 if user still not found
    if (!user) {
      return Response.json(
        {
          status: "error",
          message: "User Not Found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get user's plan type
    const plan = user.plan.planType;

    // Parallelize database queries for better performance
    const [businessProfileResult, feedbackResult] = await Promise.all([
      // Only fetch BusinessProfile if user is a business
      user.role === "BUSINESS"
        ? BusinessProfile.findOne({ userId: user._id }).lean()
        : Promise.resolve(null),
      // Always fetch feedback (lightweight query)
      Feedback.findOne({ userId }).lean(),
    ]);

    // Type assertions for lean() results - TypeScript doesn't infer Mongoose schema types
    const businessProfile = businessProfileResult as {
      aiCreditsRemaining?: number;
      aiCreditsTotal?: number;
      subscriptionCurrentPeriodEnd?: Date | null;
    } | null;
    const feedback = feedbackResult as {
      id?: any;
      avatar?: any;
      star?: any;
      comment?: any;
    } | null;

    // For business users, get credits from BusinessProfile
    let credits = user.credits || 0;
    let totalCredits = credits;
    let renewalDate: Date | null = null;
    if (businessProfile) {
      credits = businessProfile.aiCreditsRemaining ?? 0;
      totalCredits = businessProfile.aiCreditsTotal ?? credits;
      renewalDate = businessProfile.subscriptionCurrentPeriodEnd ?? null;
    }

    // Return combined user profile data
    return Response.json(
      {
        billing: {
          plan,
          details: user.plan,
          credits,
          totalCredits,
          renewalDate: renewalDate ? renewalDate.toISOString() : null,
        },
        myFeedback: {
          submited: feedback?.id ? true : false,
          feedback: {
            avatar: feedback?.avatar,
            star: feedback?.star,
            comment: feedback?.comment,
          },
        },
        user: {
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    // Log and return server error
    console.error(err);
    return Response.json(
      {
        status: "error",
        message: "Server Error!",
        code: "SERVER_ERR",
      },
      { status: 500 }
    );
  }
};
