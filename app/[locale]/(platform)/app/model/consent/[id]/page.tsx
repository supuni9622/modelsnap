import { Metadata } from "next";
import { ConsentRequestDetail } from "@/components/platform/models/consent-request-detail";

export const metadata: Metadata = {
  title: "Consent Request | ModelSnap.ai",
  description: "Review consent request details",
};

interface ConsentRequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsentRequestDetailPage({
  params,
}: ConsentRequestDetailPageProps) {
  const { id } = await params;
  return <ConsentRequestDetail requestId={id} />;
}

