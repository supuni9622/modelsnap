"use client";

import { ModelMarketplace } from "@/components/platform/models/model-marketplace";

export default function ModelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Models Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Browse AI avatars and human models. Request consent to use human models for your projects.
        </p>
      </div>
      <ModelMarketplace />
    </div>
  );
}

