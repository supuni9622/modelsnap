"use client";

import { useAppContext } from "@/context/app";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * LoadUserData Component
 * 
 * Silently loads user billing and account data in the background.
 * Does not show any loading UI - loads data asynchronously without blocking the page.
 * 
 * Used in both guest and platform layouts to preload user data when signed in.
 */
export default function LoadUserData() {
  const { setBilling, setUser } = useAppContext();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    // Only fetch when signed in - don't block landing page
    if (!isSignedIn) {
      return;
    }

    // Fetch user data silently in the background
    const fetchUserBillingData = async () => {
      try {
        const res = await fetch(`/api/app`, {
          method: "GET",
          cache: "no-store", // Always get fresh data to show correct credits
        });

        // 401 is expected when user is not signed in - don't treat as error
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setBilling(data.billing);
        setUser(data.user);
      } catch (error) {
        // Silently handle errors - don't block UI
        console.debug("Failed to load user data:", error);
      }
    };

    // Fetch in background without blocking
    fetchUserBillingData();
  }, [isSignedIn, setBilling, setUser]);

  // Return null - this component doesn't render anything
  // It just loads data in the background
  return null;
}
