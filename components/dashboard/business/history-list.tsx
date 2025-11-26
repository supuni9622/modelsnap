"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

interface Generation {
  _id: string;
  type: "AI_AVATAR" | "HUMAN_MODEL";
  garmentImageUrl: string;
  outputS3Url?: string;
  previewImageUrl?: string;
  status: string;
  creditsUsed?: number;
  royaltyPaid?: number;
  modelName?: string;
  modelId?: string;
  createdAt: string;
}

export function HistoryList() {
  const [page, setPage] = useState(1);
  const [modelType, setModelType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["generations", page, modelType, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (modelType !== "all") {
        params.append("modelType", modelType);
      }
      if (status !== "all") {
        params.append("status", status);
      }

      const res = await fetch(`/api/generations?${params}`);
      const data = await res.json();
      if (data.status === "success") {
        return data.data;
      }
      throw new Error(data.message || "Failed to fetch generations");
    },
  });

  const handleDownload = async (generationId: string, type: "AI_AVATAR" | "HUMAN_MODEL", modelId?: string) => {
    try {
      // For human models, check purchase status first
      if (type === "HUMAN_MODEL" && modelId) {
        const purchaseRes = await fetch(`/api/models/${modelId}/purchase-status`);
        const purchaseData = await purchaseRes.json();
        if (purchaseData.status === "success" && !purchaseData.data?.isPurchased) {
          toast.error("Purchase model access to download");
          return;
        }
      }
      
      const downloadUrl = `/api/render/download?id=${generationId}&type=${type === "HUMAN_MODEL" ? "human" : "ai"}`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === "PURCHASE_REQUIRED") {
          toast.error(errorData.message || "Purchase model access to download");
          return;
        }
        throw new Error(errorData.message || "Download failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generation-${generationId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (err) {
      toast.error((err as Error).message || "Failed to download image");
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load history</p>
        <p className="text-sm text-muted-foreground mt-2">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  const generations = data?.generations || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={modelType} onValueChange={setModelType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Model Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="AI_AVATAR">AI Avatars</SelectItem>
            <SelectItem value="HUMAN_MODEL">Human Models</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {generations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No generations found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.map((gen: Generation) => (
              <Card key={gen._id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    {(() => {
                      // Always use watermarked preview URL for display
                      // Never use outputS3Url directly (it's non-watermarked)
                      let imageUrl: string | null = null;
                      
                      // Priority 1: Use previewImageUrl from API (already includes full watermarked URL)
                      if (gen.previewImageUrl) {
                        imageUrl = gen.previewImageUrl;
                      } 
                      // Priority 2: Construct watermarked URL if outputS3Url exists
                      else if (gen.outputS3Url) {
                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                        const typeParam = gen.type === "HUMAN_MODEL" ? "human" : "ai";
                        // Add cache-busting parameter to ensure fresh watermarked image
                        imageUrl = `${baseUrl}/api/images/${gen._id}/watermarked?type=${typeParam}&v=1`;
                      }
                      
                      return imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt="Generated image"
                          fill
                          className="object-cover"
                          unoptimized
                          key={`watermarked-${gen._id}`} // Force re-render to avoid cache
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <p className="text-muted-foreground">No image</p>
                        </div>
                      );
                    })()}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge
                        variant={
                          gen.status === "completed"
                            ? "default"
                            : gen.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {gen.status}
                      </Badge>
                      <Badge variant="outline">
                        {gen.type === "AI_AVATAR" ? (
                          <Sparkles className="w-3 h-3 mr-1" />
                        ) : (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        {gen.type === "AI_AVATAR" ? "AI" : "Human"}
                      </Badge>
                    </div>
                    {(gen.previewImageUrl || gen.outputS3Url) && (
                      <div className="absolute bottom-2 right-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            handleDownload(gen._id, gen.type, gen.modelId)
                          }
                          disabled={gen.type === "HUMAN_MODEL" && !gen.modelId}
                          title={gen.type === "HUMAN_MODEL" && !gen.modelId ? "Purchase required" : "Download"}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">
                      {gen.type === "AI_AVATAR"
                        ? `${gen.creditsUsed || 1} credit used`
                        : gen.modelName
                        ? `Model: ${gen.modelName}`
                        : "Human model"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(gen.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

