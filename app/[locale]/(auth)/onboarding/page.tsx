import { Metadata } from "next";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";

export const metadata: Metadata = {
  title: "Choose Your Role | ModelSnap.ai",
  description: "Select whether you're a business or a model",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}

