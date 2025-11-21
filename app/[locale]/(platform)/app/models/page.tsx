import { Metadata } from "next";
import { ModelMarketplace } from "@/components/platform/models/model-marketplace";

export const metadata: Metadata = {
  title: "Model Marketplace | ModelSnap.ai",
  description: "Browse and select human models for your fashion photography",
};

export default function ModelMarketplacePage() {
  return <ModelMarketplace />;
}

