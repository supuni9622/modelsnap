import { Metadata } from "next";
import { AdminConsentManagement } from "@/components/admin/admin-consent-management";

export const metadata: Metadata = {
  title: "Consent Management | Admin | ModelSnap.ai",
  description: "Manage consent requests between businesses and models",
};

export default function AdminConsentPage() {
  return <AdminConsentManagement />;
}

