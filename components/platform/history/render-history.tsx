import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Render {
  _id: string;
  userId: string;
  garmentImageUrl: string;
  avatarId: string;
  renderedImageUrl?: string;
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

export async function RenderHistory({ initialRenders, page = 1, limit = 10 }: RenderHistoryProps) {
  const { renders, pagination } = initialRenders
    ? { renders: initialRenders, pagination: { page, limit, total: initialRenders.length, totalPages: 1, hasNextPage: false, hasPrevPage: false } }
    : await fetchRenderHistory(page, limit);

  if (renders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Render History</CardTitle>
          <CardDescription>Your past clothing renders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No renders yet. Create your first render to see it here!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Render History</CardTitle>
        <CardDescription>
          {pagination.total} render{pagination.total !== 1 ? "s" : ""} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {renders.map((render) => (
            <div
              key={render._id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(render.status)}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(render.createdAt)}
                    </span>
                  </div>
                  {render.errorMessage && (
                    <p className="text-sm text-destructive mt-2">{render.errorMessage}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Credits used</p>
                  <p className="font-semibold">{render.creditsUsed}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Garment</p>
                  <div className="relative aspect-square rounded-lg border overflow-hidden">
                    <img
                      src={render.garmentImageUrl}
                      alt="Garment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {render.renderedImageUrl && render.status === "completed" && (
                  <div>
                    <p className="text-sm font-medium mb-2">Rendered Result</p>
                    <div className="relative aspect-square rounded-lg border overflow-hidden">
                      <img
                        src={render.renderedImageUrl}
                        alt="Rendered result"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <a
                      href={render.renderedImageUrl}
                      download={`render-${render._id}.jpg`}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground mt-2 w-full"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
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
                <Button variant="outline" size="sm" asChild>
                  <a href={`?page=${pagination.page - 1}`}>Previous</a>
                </Button>
              )}
              {pagination.hasNextPage && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`?page=${pagination.page + 1}`}>Next</a>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

