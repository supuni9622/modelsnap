import { Metadata } from "next";
import { InvoiceList } from "@/components/platform/billing/invoice-list";

export const metadata: Metadata = {
  title: "Invoices | ModelSnap.ai",
  description: "View your payment invoices",
};

export default function InvoicesPage() {
  return <InvoiceList />;
}

