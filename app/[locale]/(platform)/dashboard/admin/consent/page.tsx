import { Metadata } from "next";
import { AdminConsentManagement } from "@/components/admin/admin-consent-management";

export const metadata: Metadata = {
  title: "Consent Management | Admin | ModelSnapper.ai",
  description: "Manage consent requests between businesses and models",
};

export default function AdminConsentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consent Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all consent requests from businesses to models
        </p>
      </div>
      <AdminConsentManagement />
    </div>
  );
}

