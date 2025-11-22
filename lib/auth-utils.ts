import { auth, currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";

export type UserRole = "BUSINESS" | "MODEL" | "ADMIN" | null;

/**
 * Check if user is admin based on ADMIN_EMAILS environment variable
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) return false;

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
    return adminEmails.includes(user.emailAddresses[0].emailAddress);
  } catch {
    return false;
  }
}

/**
 * Get user role from database or admin check
 */
export async function getUserRole(): Promise<UserRole> {
  try {
    await connectDB();
    const { userId } = await auth();
    if (!userId) return null;

    // Check if admin first
    const admin = await isAdmin();
    if (admin) return "ADMIN";

    // Get role from database
    const user = await User.findOne({ id: userId });
    return (user?.role as UserRole) || null;
  } catch {
    return null;
  }
}

