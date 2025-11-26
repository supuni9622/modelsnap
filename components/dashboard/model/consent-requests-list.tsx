"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { ConsentRequestDetail } from "@/components/platform/models/consent-request-detail";
import { useState } from "react";

interface ConsentRequest {
  _id: string;
  businessId: {
    _id: string;
    businessName: string;
    description?: string;
  };
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  message?: string;
}

export function ConsentRequestsList() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["consent-requests", "model"],
    queryFn: async () => {
      const res = await fetch("/api/consent?type=received");
      const data = await res.json();
      if (data.status === "success") {
        return data.data.requests || [];
      }
      throw new Error(data.message || "Failed to fetch requests");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/consent/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        throw new Error(data.message || "Failed to approve");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Consent request approved");
      queryClient.invalidateQueries({ queryKey: ["consent-requests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/consent/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        throw new Error(data.message || "Failed to reject");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Consent request rejected");
      queryClient.invalidateQueries({ queryKey: ["consent-requests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject request");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const requests = data || [];
  const pendingRequests = requests.filter((r: ConsentRequest) => r.status === "PENDING");

  if (selectedRequest) {
    return (
      <div>
        <Button variant="outline" onClick={() => setSelectedRequest(null)} className="mb-4">
          Back to List
        </Button>
        <ConsentRequestDetail requestId={selectedRequest} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No pending consent requests</p>
          </CardContent>
        </Card>
      ) : (
        pendingRequests.map((request: ConsentRequest) => (
          <Card key={request._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{request.businessId.businessName}</CardTitle>
                  <CardDescription>
                    Requested {new Date(request.requestedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{request.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {request.message && (
                <p className="text-sm text-muted-foreground mb-4">{request.message}</p>
              )}
              <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(request._id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(request._id)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => rejectMutation.mutate(request._id)}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

