"use client";

import { ModelProfileCreate } from "@/components/platform/models/model-profile-create";
import { ModelProfileEdit } from "@/components/platform/models/model-profile-edit";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ModelProfilePage() {
  const { userId } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkProfile = async () => {
      try {
        const response = await fetch("/api/models?userId=" + userId);
        const data = await response.json();
        
        if (data.status === "success" && data.data.models?.length > 0) {
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      } catch (error) {
        console.error("Failed to check profile:", error);
        setHasProfile(false);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
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
        <h1 className="text-3xl font-bold tracking-tight">Model Profile</h1>
        <p className="text-muted-foreground mt-2">
          {hasProfile
            ? "Update your model profile information"
            : "Create your model profile to start earning royalties"}
        </p>
      </div>
      {hasProfile ? <ModelProfileEdit /> : <ModelProfileCreate />}
    </div>
  );
}

