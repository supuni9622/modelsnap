"use client";

import React, { useEffect, useState } from "react";
import { ModelProfileView } from "@/components/platform/models/model-profile-view";

export default function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const [modelId, setModelId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then((p) => {
      setModelId(p.id);
      setIsLoading(false);
    });
  }, [params]);

  if (isLoading || !modelId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <ModelProfileView modelId={modelId} />;
}

