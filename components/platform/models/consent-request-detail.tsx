"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, Building2, Mail, Globe, Eye } from "lucide-react";
import { BusinessProfileView } from "./business-profile-view";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConsentRequest {
  _id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  grantedAt?: string;
  rejectedAt?: string;
  businessId: {
    _id: string;
    businessName: string;
    businessType?: string;
    website?: string;
    description?: string;
  };
  modelId: {
    _id: string;
    name: string;
  };
}

export function ConsentRequestDetail({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<ConsentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showBusinessProfile, setShowBusinessProfile] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/consent/${requestId}`);
      const data = await response.json();

      if (data.status === "success") {
        setRequest(data.data);
      } else {
        toast.error(data.message || "Failed to load consent request");
      }
    } catch (error) {
      toast.error("Failed to load consent request");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setShowApproveDialog(false);
    setProcessing(true);
    try {
      const response = await fetch(`/api/consent/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Consent request approved!");
        fetchRequest();
        setTimeout(() => {
          router.push("/dashboard/model/requests");
        }, 2000);
      } else {
        toast.error(data.message || "Failed to approve request");
      }
    } catch (error) {
      toast.error("Failed to approve request");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setShowRejectDialog(false);
    setProcessing(true);
    try {
      const response = await fetch(`/api/consent/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "REJECTED" }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Consent request rejected");
        fetchRequest();
        setTimeout(() => {
          router.push("/dashboard/model/requests");
        }, 2000);
      } else {
        toast.error(data.message || "Failed to reject request");
      }
    } catch (error) {
      toast.error("Failed to reject request");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Consent request not found</p>
        <Button onClick={() => router.back()} className="mt-4" variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (request.status) {
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
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Consent Request</h1>
          <p className="text-muted-foreground">
            From {request.businessId.businessName}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-semibold">{request.businessId.businessName}</p>
            </div>
            {request.businessId.businessType && (
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-semibold">{request.businessId.businessType}</p>
              </div>
            )}
            {request.businessId.website && (
              <div>
                <p className="text-sm text-muted-foreground">Website</p>
                <a
                  href={request.businessId.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Globe className="h-4 w-4" />
                  {request.businessId.website}
                </a>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setShowBusinessProfile(true)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Business Profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requested</p>
              <p className="font-semibold">
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </p>
            </div>
            {request.grantedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="font-semibold">
                  {formatDistanceToNow(new Date(request.grantedAt), { addSuffix: true })}
                </p>
              </div>
            )}
            {request.rejectedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="font-semibold">
                  {formatDistanceToNow(new Date(request.rejectedAt), { addSuffix: true })}
                </p>
              </div>
            )}

            {request.status === "PENDING" && (
              <div className="pt-4 space-y-2">
                <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                  <AlertDialogContent className="sm:max-w-[500px]">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <AlertDialogHeader className="space-y-2">
                        <AlertDialogTitle className="text-2xl font-bold">
                          Approve Consent Request?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base leading-relaxed">
                          Once approved, <strong className="text-foreground">{request.businessId.businessName}</strong> will be able to use your model profile for generating fashion images.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      
                      <div className="w-full space-y-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-100">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Royalty Information</span>
                        </div>
                        <div className="text-left space-y-1.5 text-sm text-green-800 dark:text-green-200">
                          <div className="flex items-center justify-between">
                            <span>Royalty per generation:</span>
                            <span className="font-semibold text-green-900 dark:text-green-100">$2.00</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Payment:</span>
                            <span className="font-semibold text-green-900 dark:text-green-100">Automatic</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleApprove}
                        disabled={processing}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve Request
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                  <AlertDialogContent className="sm:max-w-[500px]">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogHeader className="space-y-2">
                        <AlertDialogTitle className="text-2xl font-bold">
                          Reject Consent Request?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base leading-relaxed">
                          <strong className="text-foreground">{request.businessId.businessName}</strong> will not be able to use your model profile. This action cannot be undone, but they can send a new request in the future.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      
                      <div className="w-full space-y-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
                          <Clock className="h-4 w-4" />
                          <span>What happens next?</span>
                        </div>
                        <div className="text-left space-y-1.5 text-sm text-amber-800 dark:text-amber-200">
                          <p>• The business will be notified of your decision</p>
                          <p>• They can send a new request at any time</p>
                          <p>• Your decision is final for this request</p>
                        </div>
                      </div>
                    </div>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReject}
                        disabled={processing}
                        className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg transition-all"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Request
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button
                  onClick={() => setShowApproveDialog(true)}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all h-11 text-base font-medium"
                  size="lg"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Approve Request
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={processing}
                  variant="destructive"
                  className="w-full shadow-md hover:shadow-lg transition-all h-11 text-base font-medium"
                  size="lg"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject Request
                </Button>
              </div>
            )}

            {request.status === "APPROVED" && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  This business can now use your model profile. Each generation will cost
                  $2.00, which will be paid to you as a royalty.
                </p>
              </div>
            )}

            {request.status === "REJECTED" && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  This request has been rejected. The business cannot use your model
                  profile.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showBusinessProfile && request.businessId._id && (
        <BusinessProfileView
          businessId={request.businessId._id}
          open={showBusinessProfile}
          onOpenChange={setShowBusinessProfile}
        />
      )}
    </div>
  );
}

