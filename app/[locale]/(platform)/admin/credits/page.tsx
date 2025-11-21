import { Metadata } from "next";
import { AdminCreditAdjustment } from "@/components/admin/admin-credit-adjustment";

export const metadata: Metadata = {
  title: "Credit Adjustment | Admin | ModelSnap.ai",
  description: "Manage user credits and view transaction history",
};

export default function AdminCreditsPage() {
  return <AdminCreditAdjustment />;
}

