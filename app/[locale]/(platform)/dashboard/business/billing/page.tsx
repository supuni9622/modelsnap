import { Metadata } from "next";
import BillingInfo from "@/components/platform/billing/billing-info";
import { InvoiceList } from "@/components/platform/billing/invoice-list";
import UpgradePlanComponents from "@/components/platform/billing/upgrade-plan";

export const metadata: Metadata = {
  title: "Billing | ModelSnap.ai",
  description: "Manage your subscription, credits, and invoices",
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan, view credits, and access invoices
        </p>
      </div>
      <BillingInfo />
      <UpgradePlanComponents />
      <InvoiceList />
    </div>
  );
}

