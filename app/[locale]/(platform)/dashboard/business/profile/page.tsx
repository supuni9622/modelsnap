import { Metadata } from "next";
import { BusinessProfileForm } from "@/components/dashboard/business/business-profile-form";

export const metadata: Metadata = {
  title: "Business Profile | ModelSnapper.ai",
  description: "Manage your business profile information",
};

export default function BusinessProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Profile</h1>
        <p className="text-muted-foreground mt-2">
          Update your business information. Models can view this before approving consent requests.
        </p>
      </div>
      <BusinessProfileForm />
    </div>
  );
}

