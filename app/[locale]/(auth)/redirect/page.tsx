import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserRole, isAdmin } from "@/lib/auth-utils";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import BusinessProfile from "@/models/business-profile";
import ModelProfile from "@/models/model-profile";

/**
 * Redirect page that checks user role after sign-in/sign-up and redirects accordingly
 * This is used as the afterSignInUrl and afterSignUpUrl in ClerkProvider
 * 
 * For new signups: Always redirect to onboarding to let them choose their role
 * For existing users: Redirect based on their role
 */
export default async function RedirectPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  await connectDB();

  // Check if user exists in database
  let user = await User.findOne({ id: userId });
  
  // If user doesn't exist yet (webhook hasn't processed), wait a moment and check again
  if (!user) {
    // Wait for webhook to process (up to 2 seconds)
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const retryUser = await User.findOne({ id: userId });
      if (retryUser) {
        user = retryUser; // Update user variable
        break;
      }
    }
  }
  
  // If user still doesn't exist after retries, redirect to onboarding
  // (webhook might be delayed, but user should complete onboarding when webhook processes)
  if (!user) {
    redirect("/onboarding");
  }

  // Check if admin first (doesn't require database user)
  const admin = await isAdmin();
  if (admin) {
    redirect("/dashboard/admin/analytics");
  }

  // Get role from database
  const role = await getUserRole();

  // Redirect based on role
  // If no role or role is null, always go to onboarding (especially for new signups)
  if (!role || role === null) {
    redirect("/onboarding");
  } else if (role === "ADMIN") {
    redirect("/dashboard/admin/analytics");
  } else if (role === "BUSINESS") {
    // Ensure business profile exists (as per UI_FLOW.md requirements)
    if (user) {
      const businessProfile = await BusinessProfile.findOne({ userId: user._id });
      if (!businessProfile) {
        // Create business profile automatically
        await BusinessProfile.create({
          userId: user._id,
          businessName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "My Business",
          description: "",
          aiCredits: user.credits || 0,
          subscriptionStatus: user.plan?.type === "free" ? "FREE" : "STARTER",
          approvedModels: [],
        });
        console.log("✅ Business profile created automatically during redirect");
      }
    }
    redirect("/dashboard/business/generate");
  } else if (role === "MODEL") {
    // Ensure model profile exists (as per UI_FLOW.md requirements)
    if (user) {
      const modelProfile = await ModelProfile.findOne({ userId: user._id });
      if (!modelProfile) {
        // Create model profile automatically (user will add reference images later)
        await ModelProfile.create({
          userId: user._id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Model",
          referenceImages: [], // User will add these later
          consentSigned: false,
          status: "active",
          royaltyBalance: 0,
          approvedBusinesses: [],
        });
        console.log("✅ Model profile created automatically during redirect");
      }
    }
    redirect("/dashboard/model/profile");
  } else {
    // Fallback to onboarding
    redirect("/onboarding");
  }
}

