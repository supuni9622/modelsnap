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
            // Use the correct endpoint to get current user's profile
            const profileResponse = await fetch("/api/model/profile");
            const profileData = await profileResponse.json();

            // If model has no profile and not already on a model page, redirect to profile
            // Allow access to all model pages (profile, requests, earnings) even if profile is incomplete
            const isOnModelPage = pathname?.includes("/dashboard/model/");
            const isOnProfilePage = pathname?.includes("/dashboard/model/profile");
            
            if (
              profileData.status !== "success" &&
              !isOnModelPage &&
              !pathname?.includes("/onboarding")
            ) {
              // Only redirect to profile if profile doesn't exist AND user is not on any model page
              router.push("/dashboard/model/profile");
              return;
            }
            
            // If profile exists or user is on a model page, allow access
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

