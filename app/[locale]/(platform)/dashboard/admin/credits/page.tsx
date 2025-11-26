import { Metadata } from "next";
import { AdminCreditAdjustment } from "@/components/admin/admin-credit-adjustment";

export const metadata: Metadata = {
  title: "Credit Management | Admin | ModelSnap.ai",
  description: "Adjust user credits and view credit transaction history",
};

export default function AdminCreditsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credit Management</h1>
        <p className="text-muted-foreground mt-2">
          Add or remove credits for users and view all credit transactions
        </p>
      </div>
      <AdminCreditAdjustment />
    </div>
  );
}

