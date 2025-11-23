"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import { ConsentRequestDialog } from "./consent-request-dialog";
import { toast } from "sonner";
import Image from "next/image";

interface ModelProfile {
  _id: string;
  name: string;
  referenceImages: string[];
  status: string;
  royaltyBalance: number;
  price?: number;
  consentRequired?: boolean;
  userId: {
    firstName?: string;
    lastName?: string;
    picture?: string;
    emailAddress?: string[];
  };
}

interface ConsentStatus {
  hasConsent: boolean;
  status: "APPROVED" | "PENDING" | "REJECTED" | "NO_REQUEST";
}

export function ModelProfileView({ modelId }: { modelId: string }) {
  const router = useRouter();
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<{ isPurchased: boolean; price?: number } | null>(null);

  useEffect(() => {
    fetchModelProfile();
    checkConsentStatus();
    checkPurchaseStatus();
  }, [modelId]);

  const fetchModelProfile = async () => {
    try {
      const response = await fetch(`/api/models/${modelId}`);
      const data = await response.json();

      if (data.status === "success") {
        setModel(data.data);
      } else {
        toast.error(data.message || "Failed to load model profile");
      }
    } catch (error) {
      toast.error("Failed to load model profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkConsentStatus = async () => {
    try {
      const response = await fetch(`/api/consent?type=sent`);
      const data = await response.json();

      if (data.status === "success") {
        // Check if there's a request for this model
        const requests = data.data.requests || [];
        const request = requests.find((r: any) => r.modelId?._id === modelId || r.modelId?._id?.toString() === modelId);

        if (request) {
          setConsentStatus({
            hasConsent: request.status === "APPROVED",
            status: request.status,
          });
        } else {
          setConsentStatus({ hasConsent: false, status: "NO_REQUEST" });
        }
      }
    } catch (error) {
      console.error("Failed to check consent status:", error);
    }
  };

  const handleConsentRequest = async () => {
    setShowDialog(true);
  };

  const handleRequestSuccess = () => {
    checkConsentStatus();
    setShowDialog(false);
    toast.success("Consent request sent successfully!");
  };

  const checkPurchaseStatus = async () => {
    try {
      const response = await fetch(`/api/models/${modelId}/purchase-status`);
      const data = await response.json();
      if (data.status === "success") {
        setPurchaseStatus({
          isPurchased: data.data?.isPurchased || false,
          price: data.data?.price,
        });
      }
    } catch (error) {
      console.error("Failed to check purchase status:", error);
    }
  };

  const handlePurchase = async () => {
    try {
      const res = await fetch(`/api/models/purchase/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        toast.error(data.message || "Failed to start purchase");
      }
    } catch (error) {
      toast.error("Failed to start purchase");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Model profile not found</p>
        <Button onClick={() => router.back()} className="mt-4" variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!consentStatus) return null;

    switch (consentStatus.status) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{model.name}</h1>
          <p className="text-muted-foreground">Model Profile</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Model Images */}
        <Card>
          <CardHeader>
            <CardTitle>Reference Images</CardTitle>
            <CardDescription>
              {model.referenceImages?.length || 0} reference images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {model.referenceImages?.map((image, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={image}
                    alt={`Reference ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Model Info */}
        <Card>
          <CardHeader>
            <CardTitle>Model Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={model.userId?.picture} />
                <AvatarFallback>
                  {model.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{model.name}</p>
                <p className="text-sm text-muted-foreground">
                  {model.userId?.firstName} {model.userId?.lastName}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={model.status === "active" ? "default" : "secondary"}>
                  {model.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Royalty Balance:</span>
                <span className="font-semibold">${model.royaltyBalance.toFixed(2)}</span>
              </div>
              {model.price && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Price:</span>
                  <span className="font-semibold">${(model.price / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Consent Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Consent Status:</span>
                {getStatusBadge()}
              </div>

              {consentStatus?.status === "NO_REQUEST" && (
                <Button onClick={handleConsentRequest} className="w-full">
                  <Building2 className="h-4 w-4 mr-2" />
                  Request Consent
                </Button>
              )}

              {consentStatus?.status === "APPROVED" && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    You have consent to use this model.
                  </p>
                </div>
              )}

              {/* Purchase Status */}
              {purchaseStatus && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Purchase Status:</span>
                    {purchaseStatus.isPurchased ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Purchased
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Purchased</Badge>
                    )}
                  </div>

                  {!purchaseStatus.isPurchased && model.price && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                          Purchase this model to download non-watermarked images.
                        </p>
                        <p className="text-sm font-semibold">
                          Price: ${(model.price / 100).toFixed(2)}
                        </p>
                      </div>
                      {(!model.consentRequired || consentStatus?.status === "APPROVED") ? (
                        <Button onClick={handlePurchase} className="w-full">
                          Purchase Model Access
                        </Button>
                      ) : (
                        <Button disabled className="w-full" variant="outline">
                          Request Consent First
                        </Button>
                      )}
                    </div>
                  )}

                  {purchaseStatus.isPurchased && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400">
                        You have purchased access to this model. You can download non-watermarked images.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {consentStatus?.status === "PENDING" && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Your consent request is pending approval from the model.
                  </p>
                </div>
              )}

              {consentStatus?.status === "REJECTED" && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Your consent request was rejected. You cannot use this model.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ConsentRequestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        modelId={modelId}
        modelName={model.name}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}

