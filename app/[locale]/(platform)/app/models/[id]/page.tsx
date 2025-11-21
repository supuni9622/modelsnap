import { Metadata } from "next";
import { ModelProfileView } from "@/components/platform/models/model-profile-view";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Model Profile | ModelSnap.ai",
  description: "View model profile and request consent",
};

interface ModelProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ModelProfilePage({
  params,
}: ModelProfilePageProps) {
  const { id } = await params;

  return <ModelProfileView modelId={id} />;
}

