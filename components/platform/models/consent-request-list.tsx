"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, XCircle, Building2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ConsentRequest {
  _id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  businessId: {
    _id: string;
    businessName: string;
  };
  modelId: {
    _id: string;
    name: string;
  };
}

export function ConsentRequestList() {
  const router = useRouter();
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/consent?type=received");
      const data = await response.json();

      if (data.status === "success") {
        setRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch consent requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const otherRequests = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consent Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage consent requests from businesses
        </p>
      </div>

      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Requests</h2>
          {pendingRequests.map((request) => (
            <Card key={request._id} className="border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {request.businessId.businessName}
                    </CardTitle>
                    <CardDescription>
                      Requested {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    asChild
                    variant="outline"
                    onClick={() => router.push(`/app/model/consent/${request._id}`)}
                  >
                    <Link href={`/app/model/consent/${request._id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review Request
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {otherRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {pendingRequests.length > 0 ? "Other Requests" : "All Requests"}
          </h2>
          {otherRequests.map((request) => (
            <Card key={request._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {request.businessId.businessName}
                    </CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  onClick={() => router.push(`/app/model/consent/${request._id}`)}
                >
                  <Link href={`/app/model/consent/${request._id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No consent requests yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Businesses will send you consent requests to use your model profile
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

