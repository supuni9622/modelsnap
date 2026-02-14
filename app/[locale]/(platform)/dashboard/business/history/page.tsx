"use client";

import { RenderHistory } from "@/components/platform/history/render-history";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo History</h1>
        <p className="text-muted-foreground mt-2">
          View and download all your finished photos
        </p>
      </div>
      <RenderHistory />
    </div>
  );
}

