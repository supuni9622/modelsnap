import { Metadata } from "next";
import { AdminSubscriptionsList } from "@/components/admin/admin-subscriptions-list";

export const metadata: Metadata = {
  title: "Subscriptions | Admin | ModelSnap.ai",
  description: "View and manage all user subscriptions",
};

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
        <p className="text-muted-foreground mt-2">
          View all active subscriptions and manage subscription status
        </p>
      </div>
      <AdminSubscriptionsList />
    </div>
  );
}

