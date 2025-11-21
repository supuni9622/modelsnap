import { Metadata } from "next";
import { AdminPayoutManagement } from "@/components/admin/admin-payout-management";

export const metadata: Metadata = {
  title: "Payout Management | ModelSnap.ai Admin",
  description: "Manage model payout requests",
};

export default function AdminPayoutsPage() {
  return <AdminPayoutManagement />;
}

