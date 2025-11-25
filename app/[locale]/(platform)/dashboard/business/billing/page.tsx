import { Metadata } from "next";
import { InvoiceList } from "@/components/platform/billing/invoice-list";
import UpgradePlanComponents from "@/components/platform/billing/upgrade-plan";
import CurrentPlanCard from "@/components/platform/billing/current-plan-card";
import MonthlyCreditsCard from "@/components/platform/billing/monthly-credits-card";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CurrentPlanCard />
        <MonthlyCreditsCard />
      </div>
      <UpgradePlanComponents />
      <InvoiceList />
    </div>
  );
}

