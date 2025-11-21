import { Metadata } from "next";
import { ConsentRequestList } from "@/components/platform/models/consent-request-list";

export const metadata: Metadata = {
  title: "Consent Requests | ModelSnap.ai",
  description: "Manage consent requests from businesses",
};

export default function ConsentRequestsPage() {
  return <ConsentRequestList />;
}

