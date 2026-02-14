"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Clock, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { PreviewImageDialog } from "@/components/platform/preview-image-dialog";

interface Render {
  _id: string;
  userId: string;
  garmentImageUrl: string;
  avatarId: string;
  renderedImageUrl?: string;
  outputS3Url?: string;
  outputUrl?: string;
  previewImageUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  creditsUsed: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface RenderHistoryProps {
  initialRenders?: Render[];
  page?: number;
  limit?: number;
}

async function fetchRenderHistory(page = 1, limit = 10): Promise<{
  renders: Render[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/render/history?page=${page}&limit=${limit}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (data.status === "success") {
      return data.data;
    }

    return {
      renders: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (error) {
    console.error("Error fetching render history:", error);
    return {
      renders: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
}

function getStatusBadge(status: Render["status"]) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RenderHistory({ initialRenders, page = 1, limit = 10 }: RenderHistoryProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [renders, setRenders] = useState<Render[]>(initialRenders || []);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(!initialRenders);
  const [currentPage, setCurrentPage] = useState(page);

  // Fetch render history on mount if not provided via props
  useEffect(() => {
    if (!initialRenders) {
      const loadHistory = async () => {
        setLoading(true);
        try {
          const data = await fetchRenderHistory(currentPage, limit);
          setRenders(data.renders);
          setPagination(data.pagination);
        } catch (error) {
          console.error("Failed to load render history:", error);
        } finally {
          setLoading(false);
        }
      };
      loadHistory();
    } else {
      setRenders(initialRenders);
      setPagination({
        page,
        limit,
        total: initialRenders.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    }
  }, [initialRenders, currentPage, limit, page]);

  const handlePreview = (imageUrl: string, renderId: string) => {
    setPreviewImage(imageUrl);
    setPreviewFileName(`render-${renderId}.jpg`);
    setPreviewId(renderId);
    setPreviewOpen(true);
  };

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    setLoading(true);
    try {
      const data = await fetchRenderHistory(newPage, limit);
      setRenders(data.renders);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to load render history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Photo History</CardTitle>
          <CardDescription>Your previously created photos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your photos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (renders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Photo History</CardTitle>
          <CardDescription>Your previously created photos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No photos yet. Create your first photo to see it here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Photo History</CardTitle>
          <CardDescription>
            {pagination.total} photo{pagination.total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renders.map((render) => (
              <div
                key={render._id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(render.status)}
                      <span className="text-sm text-muted-foreground truncate">
                        {formatDate(render.createdAt)}
                      </span>
                    </div>
                    {render.errorMessage && (
                      <p className="text-sm text-destructive mt-2">{render.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-muted-foreground">Credits for this photo</p>
                    <p className="font-semibold">{render.creditsUsed}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Your Upload</p>
                    <div className="relative aspect-[3/4] max-h-[260px] w-full rounded-lg border overflow-hidden bg-muted/30">
                      <img
                        src={render.garmentImageUrl}
                        alt="Uploaded photo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {(render.previewImageUrl || render.outputS3Url || render.renderedImageUrl || render.outputUrl) && render.status === "completed" && (
                    <div>
                      <p className="text-sm font-medium mb-2">Final Photo</p>
                      <div className="relative aspect-[3/4] max-h-[260px] w-full rounded-lg border overflow-hidden bg-muted/30">
                        <img
                          src={(() => {
                            // Always use watermarked preview URL for display
                            // Never use original URLs directly (they're non-watermarked)
                            if (render.previewImageUrl) {
                              return render.previewImageUrl;
                            }
                            if (render.outputS3Url || render.renderedImageUrl || render.outputUrl) {
                              // Construct watermarked URL from render ID
                              // Use absolute URL to ensure it works correctly
                              const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                              // Add cache-busting parameter to ensure fresh watermarked image
                              return `${baseUrl}/api/images/${render._id}/watermarked?type=ai&v=1`;
                            }
                            return "";
                          })()}
                          alt="Rendered result"
                          className="w-full h-full object-contain"
                          key={`watermarked-${render._id}`} // Force re-render to avoid cache
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePreview(render.previewImageUrl || render.outputS3Url || render.renderedImageUrl || render.outputUrl || "", render._id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={async () => {
                            try {
                              const downloadUrl = `/api/render/download?id=${render._id}&type=ai`;
                              const response = await fetch(downloadUrl);
                              if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.message || "Download failed");
                              }
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `render-${render._id}.jpg`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error("Download error:", error);
                              alert((error as Error).message || "Failed to download image");
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                {pagination.hasPrevPage && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={loading}
                  >
                    Previous
                  </Button>
                )}
                {pagination.hasNextPage && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={loading}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {previewImage && (
        <PreviewImageDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          imageUrl={previewImage}
          imageTitle="Photo Preview"
          downloadFileName={previewFileName}
          generationId={previewId || undefined}
          type="ai"
        />
      )}
    </>
  );
}
