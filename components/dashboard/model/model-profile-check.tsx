"use client";

import { useQuery } from "@tanstack/react-query";
import { ModelProfileCreate } from "@/components/platform/models/model-profile-create";
import { ModelProfileEdit } from "@/components/platform/models/model-profile-edit";
import { Loader2 } from "lucide-react";

export function ModelProfileCheck() {
  const { data, isLoading } = useQuery({
    queryKey: ["model-profile"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.status === "success" && data.data.models?.length > 0) {
        return data.data.models[0];
      }
      return null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data) {
    return <ModelProfileEdit modelId={data._id} />;
  }

  return <ModelProfileCreate />;
}

