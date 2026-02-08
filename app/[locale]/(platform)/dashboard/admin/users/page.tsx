import { Metadata } from "next";
import { AdminUsersList } from "@/components/admin/admin-users-list";

export const metadata: Metadata = {
  title: "Users | Admin | ModelSnapper.ai",
  description: "View and manage all platform users",
};

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          View all users, their roles, subscriptions, and account details
        </p>
      </div>
      <AdminUsersList />
    </div>
  );
}

