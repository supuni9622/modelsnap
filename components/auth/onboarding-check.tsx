"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

/**
 * Component that checks if user needs onboarding and redirects accordingly
 * Should be used in protected routes
 */
export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Skip onboarding check for these routes
  const skipRoutes = [
    "/onboarding",
    "/redirect",
    "/sign-in",
    "/sign-up",
    "/api",
    "/setup",
  ];

  useEffect(() => {
    const checkOnboarding = async () => {
      // Skip check if not loaded or no user
      if (!isLoaded || !userId) {
        setIsChecking(false);
        return;
      }

      // Skip check for certain routes
      if (skipRoutes.some((route) => pathname?.includes(route))) {
        setIsChecking(false);
        return;
      }

      try {
        // Check user role
        const response = await fetch("/api/user/role");
        const data = await response.json();

        if (data.status === "success") {
          const role = data.data.role;

          // If user has no role set, redirect to onboarding
          if (!role) {
            setNeedsOnboarding(true);
            router.push("/onboarding");
            return;
          }

          // Check if model needs profile creation
          if (role === "MODEL") {
            const profileResponse = await fetch("/api/models?userId=" + userId);
            const profileData = await profileResponse.json();

            // If model has no profile and not already on profile page, redirect
            if (
              profileData.status === "success" &&
              (!profileData.data.models || profileData.data.models.length === 0) &&
              !pathname?.includes("/dashboard/model/profile") &&
              !pathname?.includes("/onboarding")
            ) {
              router.push("/dashboard/model/profile");
              return;
            }
          }

          // Check if ADMIN and redirect to admin dashboard
          if (role === "ADMIN" && !pathname?.includes("/dashboard/admin")) {
            router.push("/dashboard/admin/analytics");
            return;
          }

          // User has role, allow access
          setNeedsOnboarding(false);
        } else {
          // Error or no role, redirect to onboarding
          setNeedsOnboarding(true);
          router.push("/onboarding");
          return;
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // On error, allow access (fail open)
        setNeedsOnboarding(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [userId, isLoaded, pathname, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsOnboarding) {
    return null; // Redirecting, don't render children
  }

  return <>{children}</>;
}

