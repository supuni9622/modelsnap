import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";

/**
 * Check if user is admin
 * For MVP: Check if user email is in ADMIN_EMAILS environment variable
 */
async function isAdmin(): Promise<boolean> {
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connectDB();

  const admin = await isAdmin();
  if (!admin) {
    redirect("/app");
  }

  return <>{children}</>;
}

