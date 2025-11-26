"use client";

import React, { useEffect, useState } from "react";
import { ConsentRequestDetail } from "@/components/platform/models/consent-request-detail";

export default function ConsentRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const [requestId, setRequestId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then((p) => {
      setRequestId(p.id);
      setIsLoading(false);
    });
  }, [params]);

  if (isLoading || !requestId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <ConsentRequestDetail requestId={requestId} />;
}

