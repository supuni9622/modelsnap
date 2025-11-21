import BillingInfo, { SubscriptionCancel } from "@/components/platform/billing/billing-info";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing",
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="mt-5">
        <BillingInfo />
      </div>
      <div>
        <SubscriptionCancel />
      </div>
    </div>
  );
}
