"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function BusinessProfileForm() {
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");

  // Fetch existing profile
  const { data, isLoading } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => {
      const res = await fetch("/api/business/profile");
      if (res.status === 404) {
        return null; // Profile doesn't exist yet
      }
      const data = await res.json();
      if (data.status === "success") {
        return data.data;
      }
      throw new Error(data.message || "Failed to fetch profile");
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (data) {
      setBusinessName(data.businessName || "");
      setDescription(data.description || "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (payload: { businessName: string; description: string }) => {
      const res = await fetch("/api/business/profile", {
        method: data ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to save profile");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Profile saved successfully");
      queryClient.invalidateQueries({ queryKey: ["business-profile"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ businessName, description });
  };

  if (isLoading) {
    return <div className="h-96 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>
          This information will be visible to models when they review consent requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Tell models about your business..."
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

