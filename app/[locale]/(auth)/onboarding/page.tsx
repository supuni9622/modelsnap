import { Metadata } from "next";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";

export const metadata: Metadata = {
  title: "Get Started | ModelSnapper.ai",
  description: "Start creating as a business or join the model early access list",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}

