"use client";

import { ModelEarnings } from "@/components/dashboard/model/model-earnings";

export default function EarningsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground mt-2">
          Track your earnings, request payouts, and view transaction history
        </p>
      </div>
      <ModelEarnings />
    </div>
  );
}

