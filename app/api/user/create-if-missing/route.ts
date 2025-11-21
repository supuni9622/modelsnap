import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Credits } from "@/lib/config/pricing";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * POST /api/user/create-if-missing
 * Fallback endpoint to create user in MongoDB if they don't exist
 * This is called when a user signs in but doesn't exist in the database
 * (e.g., if webhook failed or wasn't configured)
 */
export const POST = withRateLimit(RATE_LIMIT_CONFIGS.API)(async (req: NextRequest) => {
  try {
    await connectDB();

    // Get authenticated user ID from Clerk
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

    // Check if user already exists
    const existingUser = await User.findOne({ id: userId });
    if (existingUser) {
      return NextResponse.json(
        {
          status: "success",
          message: "User already exists",
          data: existingUser,
        },
        { status: 200 }
      );
    }

    // Fetch user details from Clerk
    const clerkUser = await (await clerkClient()).users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json(
        {
          status: "error",
          message: "User not found in Clerk",
          code: "CLERK_USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get role from metadata or default to BUSINESS
    const role = 
      clerkUser.publicMetadata?.role || 
      clerkUser.privateMetadata?.role || 
      "BUSINESS";

    // Create user in MongoDB
    const newUser = await User.create({
      id: userId,
      firstName: clerkUser.firstName || "",
      lastName: clerkUser.lastName || "",
      emailAddress: clerkUser.emailAddresses.map((email) => email.emailAddress),
      picture: clerkUser.imageUrl || "",
      role,
      plan: { planType: "free", id: "free" },
      credits: Credits.freeCredits,
    });

    console.log(`✅ Fallback: User created in MongoDB: ${userId}`);

    return NextResponse.json(
      {
        status: "success",
        message: "User created successfully",
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating user:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create user",
        code: "CREATION_ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

