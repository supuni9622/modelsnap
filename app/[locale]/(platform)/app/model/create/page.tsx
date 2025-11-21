import { Metadata } from "next";
import { ModelProfileCreate } from "@/components/platform/models/model-profile-create";

export const metadata: Metadata = {
  title: "Create Model Profile | ModelSnap.ai",
  description: "Create your model profile to start earning royalties",
};

export default function CreateModelProfilePage() {
  return <ModelProfileCreate />;
}

