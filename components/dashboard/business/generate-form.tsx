"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useAppContext } from "@/context/app";

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
}

export function GenerateForm() {
  const { billing, setBilling, refreshBillingData } = useAppContext();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [garmentImageUrl, setGarmentImageUrl] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelType, setModelType] = useState<"ai" | "human">("ai");
  const [isUploading, setIsUploading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<"ai" | "human">("ai");
  const [modelId, setModelId] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState<boolean | null>(null);

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

  // Fetch human models with consent
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["models", "approved"],
    queryFn: async () => {
      const res = await fetch("/api/models?status=active");
      const data = await res.json();
      if (data.status === "success") {
        return data.data.models || [];
      }
      throw new Error(data.message || "Failed to fetch models");
    },
  });

  // Render mutation
  const renderMutation = useMutation({
    mutationFn: async (payload: {
      garmentImageUrl: string;
      avatarId?: string;
      avatarImageUrl?: string;
      modelId?: string;
    }) => {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status !== "success") {
        throw new Error(data.message || "Render failed");
      }
      return data;
    },
    onSuccess: async (data) => {
      // Update credits immediately from API response (optimistic update)
      if (data.data?.creditsRemaining !== undefined && billing) {
        setBilling({
          ...billing,
          credits: data.data.creditsRemaining,
        });
      }

      // Display the generated image immediately
      // Use previewImageUrl (watermarked) for display, or fallback to other URLs
      const imageUrl = data.data?.previewImageUrl || data.data?.renderedImageUrl || data.data?.outputS3Url || data.data?.fashnImageUrl;
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        setGenerationId(data.data?.generationId);
        const isHuman = data.data?.type === "HUMAN_MODEL";
        setGenerationType(isHuman ? "human" : "ai");
        
        // Check purchase status for human models
        if (isHuman && selectedModel?._id) {
          setModelId(selectedModel._id);
          try {
            const purchaseRes = await fetch(`/api/models/${selectedModel._id}/purchase-status`);
            const purchaseData = await purchaseRes.json();
            if (purchaseData.status === "success") {
              setIsPurchased(purchaseData.data?.isPurchased || false);
            }
          } catch (error) {
            console.error("Failed to check purchase status:", error);
            setIsPurchased(false);
          }
        } else {
          setIsPurchased(null);
        }
        
        setStep(3); // Show result step
        toast.success("Generation completed! Image is ready.");
      } else {
        toast.success("Generation started! Check history for results.");
        // Reset form
        setStep(1);
        setGarmentImageUrl(null);
        setSelectedAvatar(null);
        setSelectedModel(null);
      }

      // Refresh billing data to ensure sync (runs in background)
      refreshBillingData?.().catch((error) => {
        console.error("Failed to refresh billing data:", error);
        // Non-critical error, don't show to user
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start generation");
    },
  });

  const handleFileUpload = useCallback(async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Upload failed");
      }

      let imageUrl: string;

      if (data.data.uploadUrl && data.data.method === "PUT") {
        const fileBuffer = await file.arrayBuffer();
        const uploadResponse = await fetch(data.data.uploadUrl, {
          method: "PUT",
          body: fileBuffer,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload to S3");
        }

        const confirmResponse = await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ s3Key: data.data.s3Key }),
        });

        const confirmData = await confirmResponse.json();
        if (!confirmResponse.ok || confirmData.status !== "success") {
          throw new Error(confirmData.message || "Failed to confirm upload");
        }

        imageUrl = confirmData.data.url;
      } else {
        imageUrl = data.data.url;
      }

      setGarmentImageUrl(imageUrl);
      setStep(2);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error((err as Error).message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleGenerate = () => {
    if (!garmentImageUrl) {
      toast.error("Please upload a garment image first");
      return;
    }

    if (modelType === "ai" && !selectedAvatar) {
      toast.error("Please select an AI avatar");
      return;
    }

    if (modelType === "human" && !selectedModel) {
      toast.error("Please select a human model");
      return;
    }

    const payload: {
      garmentImageUrl: string;
      avatarId?: string;
      avatarImageUrl?: string;
      modelId?: string;
    } = {
      garmentImageUrl,
    };

    if (modelType === "ai") {
      payload.avatarId = selectedAvatar!._id;
      payload.avatarImageUrl = selectedAvatar!.imageUrl;
    } else {
      payload.modelId = selectedModel!._id;
    }

    renderMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Product Image</CardTitle>
            <CardDescription>Upload an image of the clothing item you want to render</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isUploading ? "border-primary" : "border-muted hover:border-primary/50"
              )}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="garment-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <label htmlFor="garment-upload" className="cursor-pointer">
                {isUploading ? (
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                ) : (
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                )}
                <p className="text-lg font-medium mb-2">
                  {isUploading ? "Uploading..." : "Drag and drop or click to upload"}
                </p>
                <p className="text-sm text-muted-foreground">
                  JPEG, PNG, WebP up to 10MB
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Model */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Model</CardTitle>
            <CardDescription>Choose between AI avatars or human models</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={modelType} onValueChange={(v) => setModelType(v as "ai" | "human")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Models
                </TabsTrigger>
                <TabsTrigger value="human">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Human Models
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="mt-4">
                {avatarsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {avatarsData?.map((avatar: Avatar) => (
                      <button
                        key={avatar._id}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                          selectedAvatar?._id === avatar._id
                            ? "border-primary ring-2 ring-primary"
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <Image
                          src={avatar.imageUrl}
                          alt={avatar.name}
                          fill
                          className="object-cover"
                        />
                        {selectedAvatar?._id === avatar._id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="human" className="mt-4">
                {modelsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : modelsData?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You have no approved human models.</p>
                    <p className="text-sm mt-2">
                      <Link href="/dashboard/business/models" className="text-primary hover:underline">
                        Browse models marketplace
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modelsData?.map((model: Model) => (
                      <button
                        key={model._id}
                        onClick={() => setSelectedModel(model)}
                        className={cn(
                          "relative rounded-lg overflow-hidden border-2 p-4 text-left transition-all",
                          selectedModel?._id === model._id
                            ? "border-primary ring-2 ring-primary"
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <div className="flex gap-4">
                          {model.referenceImages?.[0] && (
                            <div className="relative w-20 h-20 rounded overflow-hidden">
                              <Image
                                src={model.referenceImages[0]}
                                alt={model.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{model.name}</h3>
                            <p className="text-sm text-muted-foreground">Status: {model.status}</p>
                          </div>
                          {selectedModel?._id === model._id && (
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={
                  (modelType === "ai" && !selectedAvatar) ||
                  (modelType === "human" && !selectedModel)
                }
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generate / Result */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {generatedImageUrl ? "Generation Complete!" : "Step 3: Generate"}
            </CardTitle>
            <CardDescription>
              {generatedImageUrl
                ? "Your generated image is ready"
                : "Review your selection and generate the image"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedImageUrl ? (
              // Show generated image result
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Generated Image:</p>
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border bg-muted">
                    <Image
                      src={generatedImageUrl}
                      alt="Generated fashion image"
                      fill
                      className="object-contain"
                      unoptimized // FASHN CDN URLs may not be optimized
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  {/* Download button - disabled for unpurchased human models */}
                  {generationType === "human" && isPurchased === false ? (
                    <Button
                      variant="outline"
                      disabled
                      title="Purchase model access to download"
                    >
                      Download (Purchase Required)
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        // Download image via proxy to avoid CORS issues
                        if (!generationId) {
                          toast.error("Generation ID not found");
                          return;
                        }
                        try {
                          const downloadUrl = `/api/render/download?id=${generationId}&type=${generationType === "human" ? "human" : "ai"}`;
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
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `generated-${generationId || Date.now()}.jpg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                          toast.success("Download started");
                        } catch (error) {
                          console.error("Download error:", error);
                          toast.error((error as Error).message || "Failed to download image");
                        }
                      }}
                    >
                      Download
                    </Button>
                  )}
                  
                  {/* Purchase button for unpurchased human models */}
                  {generationType === "human" && isPurchased === false && modelId && (
                    <Button
                      onClick={async () => {
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
                      }}
                    >
                      Purchase Model Access
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset and start over
                      setGeneratedImageUrl(null);
                      setGenerationId(null);
                      setGenerationType("ai");
                      setStep(1);
                      setGarmentImageUrl(null);
                      setSelectedAvatar(null);
                      setSelectedModel(null);
                    }}
                  >
                    Generate Another
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/dashboard/business/history">View History</Link>
                  </Button>
                </div>
              </div>
            ) : (
              // Show preview before generation
              <>
                {garmentImageUrl && (
                  <div>
                    <p className="text-sm font-medium mb-2">Garment Image:</p>
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <Image src={garmentImageUrl} alt="Garment" fill className="object-contain" />
                    </div>
                  </div>
                )}

                {modelType === "ai" && selectedAvatar && (
                  <div>
                    <p className="text-sm font-medium mb-2">Selected AI Avatar:</p>
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                      <Image
                        src={selectedAvatar.imageUrl}
                        alt={selectedAvatar.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                {modelType === "human" && selectedModel && (
                  <div>
                    <p className="text-sm font-medium mb-2">Selected Human Model:</p>
                    <p className="text-lg">{selectedModel.name}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={renderMutation.isPending}
                    className="flex-1"
                  >
                    {renderMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

