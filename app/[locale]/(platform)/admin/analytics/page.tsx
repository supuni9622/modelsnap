import { Metadata } from "next";
import { AdminAnalyticsDashboard } from "@/components/admin/admin-analytics-dashboard";

export const metadata: Metadata = {
  title: "Analytics Dashboard | Admin | ModelSnap.ai",
  description: "View generation analytics and platform metrics",
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsDashboard />;
}

