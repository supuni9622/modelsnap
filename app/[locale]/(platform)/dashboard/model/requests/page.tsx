"use client";

import { ConsentRequestList } from "@/components/platform/models/consent-request-list";

export default function RequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consent Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and respond to consent requests from businesses who want to use your model
        </p>
      </div>
      <ConsentRequestList />
    </div>
  );
}

