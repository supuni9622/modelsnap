"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Sparkles, User, Loader2, AlertCircle } from "lucide-react";
import { ConsentRequestDialog } from "@/components/platform/models/consent-request-dialog";
import { toast } from "sonner";

interface Avatar {
  _id: string;
  name: string;
  imageUrl: string;
  gender?: string;
}

interface Model {
  _id: string;
  name: string;
  referenceImages: string[];
  status: string;
  userId?: {
    firstName?: string;
    lastName?: string;
  };
}

export function ModelsMarketplace() {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);

  // Fetch AI avatars
  const { data: avatarsData, isLoading: avatarsLoading } = useQuery({
    queryKey: ["avatars"],
    queryFn: async () => {
      const res = await fetch("/api/avatars");
      const data = await res.json();
      if (data.status === "success") {
        return data.data;
      }
      throw new Error(data.message || "Failed to fetch avatars");
    },
  });

  const [humanGenderFilter, setHumanGenderFilter] = useState<"all" | "male" | "female" | "other">("all");
  const [humanFramingFilter, setHumanFramingFilter] = useState<"all" | "full-body" | "half-body" | "three-quarter" | "upper-body" | "lower-body" | "back-view">("all");
  const [humanAspectRatioFilter, setHumanAspectRatioFilter] = useState<"all" | "2:3" | "1:1" | "4:5" | "16:9">("all");
  const [humanSkinToneFilter, setHumanSkinToneFilter] = useState<"all" | "light" | "medium" | "deep">("all");
  const [humanBackgroundFilter, setHumanBackgroundFilter] = useState<"all" | "indoor" | "outdoor">("all");

  // Fetch human models (with optional gender, framing, aspect ratio, skin tone, background filters)
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["models", humanGenderFilter, humanFramingFilter, humanAspectRatioFilter, humanSkinToneFilter, humanBackgroundFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "active" });
      if (humanGenderFilter !== "all") params.set("gender", humanGenderFilter);
      if (humanFramingFilter !== "all") params.set("photoFraming", humanFramingFilter);
      if (humanAspectRatioFilter !== "all") params.set("aspectRatio", humanAspectRatioFilter);
      if (humanSkinToneFilter !== "all") params.set("skinToneCategory", humanSkinToneFilter);
      if (humanBackgroundFilter !== "all") params.set("background", humanBackgroundFilter);
      const res = await fetch(`/api/models?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        return data.data.models || [];
      }
      throw new Error(data.message || "Failed to fetch models");
    },
  });

  // Fetch consent requests to check which models have pending/approved consent
  const { data: consentData } = useQuery({
    queryKey: ["consent-requests"],
    queryFn: async () => {
      const res = await fetch("/api/consent");
      const data = await res.json();
      if (data.status === "success") {
        return data.data.consentRequests || [];
      }
      return [];
    },
  });

  const handleRequestConsent = (model: Model) => {
    setSelectedModel(model);
    setConsentDialogOpen(true);
  };

  const getConsentStatus = (modelId: string) => {
    if (!consentData) return null;
    const consent = consentData.find(
      (c: any) => c.modelId?._id === modelId || c.modelId === modelId
    );
    return consent?.status || null;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Models
          </TabsTrigger>
          <TabsTrigger value="human">
            <User className="w-4 h-4 mr-2" />
            Human Models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Avatars</CardTitle>
              <CardDescription>
                Pre-generated AI avatars ready to use. No consent required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {avatarsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {avatarsData?.map((avatar: Avatar) => (
                      <Card key={avatar._id} className="overflow-hidden">
                        <div className="relative aspect-square">
                          <Image
                            src={avatar.imageUrl}
                            alt={avatar.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium truncate">{avatar.name}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card className="mt-6 border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Generate Custom AI Model
                      </CardTitle>
                      <CardDescription>
                        Create your own dedicated AI model tailored to your brand
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="mb-4">
                        Coming Soon
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        This feature is currently under development. Stay tuned for updates!
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="human" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Human Models</CardTitle>
              <CardDescription>
                Browse human models and request consent to use their likeness
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters: Gender & Framing (for new models from today) */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Gender:</span>
                  {(["all", "female", "male", "other"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={humanGenderFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHumanGenderFilter(value)}
                    >
                      {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Framing:</span>
                  {(["all", "full-body", "half-body", "three-quarter", "upper-body", "lower-body", "back-view"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={humanFramingFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHumanFramingFilter(value)}
                    >
                      {value === "all" ? "All" : value === "full-body" ? "Full body" : value === "half-body" ? "Half body" : value === "three-quarter" ? "Three-Quarter" : value === "upper-body" ? "Upper body" : value === "lower-body" ? "Lower body" : "Back View"}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Skin tone:</span>
                  {(["all", "light", "medium", "deep"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={humanSkinToneFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHumanSkinToneFilter(value)}
                    >
                      {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Background:</span>
                  {(["all", "indoor", "outdoor"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={humanBackgroundFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHumanBackgroundFilter(value)}
                    >
                      {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Aspect ratio:</span>
                  {(["all", "2:3", "1:1", "4:5", "16:9"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={humanAspectRatioFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHumanAspectRatioFilter(value)}
                    >
                      {value === "all" ? "All" : value === "2:3" ? "2:3 Portrait" : value === "1:1" ? "1:1 Square" : value === "4:5" ? "4:5 Vertical" : "16:9 Landscape"}
                    </Button>
                  ))}
                </div>
              </div>
              {modelsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : modelsData?.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No human models available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modelsData?.map((model: Model) => {
                    const consentStatus = getConsentStatus(model._id);
                    return (
                      <Card key={model._id} className="overflow-hidden">
                        <div className="relative h-48">
                          {model.referenceImages?.[0] ? (
                            <Image
                              src={model.referenceImages[0]}
                              alt={model.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <User className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-1">{model.name}</h3>
                          {model.userId && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {model.userId.firstName} {model.userId.lastName}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={
                                consentStatus === "APPROVED"
                                  ? "default"
                                  : consentStatus === "PENDING"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {consentStatus === "APPROVED"
                                ? "Approved"
                                : consentStatus === "PENDING"
                                ? "Pending"
                                : "No Consent"}
                            </Badge>
                            {consentStatus !== "APPROVED" && (
                              <Button
                                size="sm"
                                onClick={() => handleRequestConsent(model)}
                                disabled={consentStatus === "PENDING"}
                              >
                                {consentStatus === "PENDING" ? "Requested" : "Request Consent"}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedModel && (
        <ConsentRequestDialog
          open={consentDialogOpen}
          onOpenChange={setConsentDialogOpen}
          modelId={selectedModel._id}
          modelName={selectedModel.name}
          onSuccess={() => {
            toast.success("Consent request sent!");
            setConsentDialogOpen(false);
            setSelectedModel(null);
          }}
        />
      )}
    </div>
  );
}

