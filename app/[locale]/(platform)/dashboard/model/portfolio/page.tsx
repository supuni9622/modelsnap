"use client";

import { ModelPortfolioCreate } from "@/components/platform/models/model-portfolio-create";
import { ModelPortfolioEdit } from "@/components/platform/models/model-portfolio-edit";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ModelPortfolioPage() {
  const { userId } = useAuth();
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkPortfolio = async () => {
      try {
        const response = await fetch("/api/model/profile");
        const data = await response.json();

        // Check if portfolio has essential fields (primaryPhoto indicates portfolio exists)
        if (data.status === "success" && data.data && data.data.primaryPhoto) {
          setHasPortfolio(true);
        } else {
          setHasPortfolio(false);
        }
      } catch (error) {
        console.error("Failed to check portfolio:", error);
        setHasPortfolio(false);
      } finally {
        setLoading(false);
      }
    };

    checkPortfolio();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Model Portfolio</h1>
        <p className="text-muted-foreground mt-2">
          {hasPortfolio
            ? "Manage your public portfolio for brands to discover"
            : "Create your model portfolio to showcase your work"}
        </p>
      </div>
      {hasPortfolio ? <ModelPortfolioEdit /> : <ModelPortfolioCreate />}
    </div>
  );
}

