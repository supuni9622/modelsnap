import { Metadata } from "next";
import { ModelDashboard } from "@/components/platform/models/model-dashboard";

export const metadata: Metadata = {
  title: "Model Dashboard | ModelSnap.ai",
  description: "View your earnings, statistics, and generation history",
};

export default function ModelDashboardPage() {
  return <ModelDashboard />;
}

