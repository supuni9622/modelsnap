"use client";

import { AppProvider } from "@/context/app";
import { OnboardingCheck } from "@/components/auth/onboarding-check";
import LoadUserData from "@/components/load-user-data";
import { FeedbackDialog } from "@/components/feedback-dialog";

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <OnboardingCheck>
        {children}
        <LoadUserData />
        <FeedbackDialog />
      </OnboardingCheck>
    </AppProvider>
  );
}

