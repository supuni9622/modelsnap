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
export default async function RedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  try {
    const { locale } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      console.log("❌ No userId, redirecting to sign-in");
      redirect(`/${locale}/sign-in`);
    }

    console.log("🔍 Redirect page hit for userId:", userId, "locale:", locale);

    await connectDB();

    // Check if user exists in database
    let user = await User.findOne({ id: userId });
    
    console.log("👤 User found in DB:", !!user, "role:", user?.role);
    
    // If user doesn't exist yet (webhook hasn't processed), wait a moment and check again
    if (!user) {
      console.log("⏳ User not found, waiting for webhook...");
      // Wait for webhook to process (up to 3 seconds)
      for (let i = 0; i < 6; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retryUser = await User.findOne({ id: userId });
        if (retryUser) {
          user = retryUser; // Update user variable
          console.log("✅ User found after retry, role:", user.role);
          break;
        }
      }
    }
    
    // If user still doesn't exist after retries, create user as fallback
    // (webhook might have failed or not been configured)
    if (!user) {
      console.log("⚠️ User still not found after retries, creating fallback user");
      try {
        // Fetch user from Clerk
        const { clerkClient } = await import("@clerk/nextjs/server");
        const clerkUser = await (await clerkClient()).users.getUser(userId);
        
        if (clerkUser) {
          // Get role - check if admin, otherwise null for onboarding
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
            credits: 10, // Default free credits
          });
          
          console.log("✅ Fallback: User created in MongoDB:", userId, "with role:", user.role);
        } else {
          console.error("❌ Could not fetch user from Clerk for fallback creation");
        }
      } catch (fallbackError) {
        console.error("❌ Fallback user creation failed:", fallbackError);
        // Continue to onboarding even if fallback fails
      }
      
      // If still no user after fallback attempt, redirect to onboarding
      if (!user) {
        console.log("⚠️ Could not create user, redirecting to onboarding");
        redirect(`/${locale}/onboarding`);
      }
    }

    // Check if admin first (doesn't require database user)
    const admin = await isAdmin();
    if (admin) {
      console.log("🔑 User is admin, redirecting to admin dashboard");
      redirect(`/${locale}/dashboard/admin/analytics`);
    }

    // Get role from database
    const role = await getUserRole();
    console.log("🎭 User role:", role);

    // Redirect based on role
    // IMPORTANT: For new signups, role should be null - always redirect to onboarding
    // Only redirect to dashboard if user has explicitly chosen a role (not default BUSINESS)
    if (!role || role === null || role === undefined) {
      console.log("➡️ No role set, redirecting to onboarding");
      redirect(`/${locale}/onboarding`);
    } else if (role === "ADMIN") {
      console.log("➡️ Admin role, redirecting to admin dashboard");
      redirect(`/${locale}/dashboard/admin/analytics`);
    } else if (role === "BUSINESS") {
      // Check if this is a new signup with default BUSINESS role (shouldn't happen, but safety check)
      // If user was just created and has BUSINESS role, they should go through onboarding
      if (user && user.createdAt && new Date().getTime() - new Date(user.createdAt).getTime() < 5000) {
        // User was created less than 5 seconds ago - likely a new signup with incorrect default role
        console.log("⚠️ New user has BUSINESS role (likely default), redirecting to onboarding instead");
        // Update role to null so they can choose properly
        await User.findOneAndUpdate({ id: userId }, { role: null });
        redirect(`/${locale}/onboarding`);
        return;
      }
      
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
      console.log("➡️ Business role, redirecting to business dashboard");
      redirect(`/${locale}/dashboard/business/generate`);
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
      console.log("➡️ Model role, redirecting to model dashboard");
      redirect(`/${locale}/dashboard/model/profile`);
    } else {
      // Fallback to onboarding
      console.log("➡️ Fallback: redirecting to onboarding");
      redirect(`/${locale}/onboarding`);
    }
  } catch (error) {
    console.error("❌ Error in redirect page:", error);
    // On error, redirect to onboarding as safe fallback
    try {
      const { locale } = await params;
      redirect(`/${locale}/onboarding`);
    } catch {
      redirect("/en/onboarding");
    }
  }
}

