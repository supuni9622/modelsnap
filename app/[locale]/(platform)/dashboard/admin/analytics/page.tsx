import { Metadata } from "next";
import { AdminAnalyticsDashboard } from "@/components/admin/admin-analytics-dashboard";

export const metadata: Metadata = {
  title: "Analytics | Admin | ModelSnapper.ai",
  description: "View platform analytics and generation statistics",
};

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor platform performance, generation statistics, and user activity
        </p>
      </div>
      <AdminAnalyticsDashboard />
    </div>
  );
}

