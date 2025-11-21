import { Metadata } from "next";
import { ModelProfileEdit } from "@/components/platform/models/model-profile-edit";

export const metadata: Metadata = {
  title: "Edit Model Profile | ModelSnap.ai",
  description: "Edit your model profile information and reference images",
};

export default function ModelProfileEditPage() {
  return <ModelProfileEdit />;
}

