"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Image as ImageIcon, Sparkles, Loader2, CheckCircle2, Mountain, FileImage, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useAppContext } from "@/context/app";
import { motion, AnimatePresence } from "framer-motion";

interface Avatar {
  _id: string;
  name?: string;
  imageUrl: string;
  gender?: string;
  bodyType?: string;
  skinTone?: string;
}

interface Model {
  _id: string;
  name: string;
  referenceImages: string[];
  status: string;
}

interface UploadedFile {
  name: string;
  size: number;
  url: string;
}

export function GenerateForm() {
  const { billing, setBilling, refreshBillingData } = useAppContext();
  const [garmentImageUrl, setGarmentImageUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelType, setModelType] = useState<"ai" | "human">("ai");
  const [isUploading, setIsUploading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<"ai" | "human">("ai");
  const [modelId, setModelId] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState<boolean | null>(null);
  const [garmentCategory, setGarmentCategory] = useState<"auto" | "tops" | "bottoms" | "one-pieces">("auto");
  const [garmentPhotoType, setGarmentPhotoType] = useState<"auto" | "flat-lay" | "model">("auto");
  const [avatarGenderFilter, setAvatarGenderFilter] = useState<"all" | "female" | "male">("all");

  // Fetch AI avatars (with optional gender filter)
  const { data: avatarsData, isLoading: avatarsLoading } = useQuery({
    queryKey: ["avatars", avatarGenderFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (avatarGenderFilter !== "all") params.set("gender", avatarGenderFilter);
      const res = await fetch(`/api/avatars?${params.toString()}`);
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
      garmentCategory?: string;
      garmentPhotoType?: string;
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
        
        toast.success("Generation completed! Image is ready.");
      } else {
        toast.success("Generation started! Check history for results.");
      }

      // Refresh billing data to ensure sync (runs in background)
      refreshBillingData?.().catch((error) => {
        console.error("Failed to refresh billing data:", error);
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start generation");
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

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
      setUploadedFile({
        name: file.name,
        size: file.size,
        url: imageUrl,
      });
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error((err as Error).message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleRemoveFile = () => {
    setGarmentImageUrl(null);
    setUploadedFile(null);
  };

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
      garmentCategory?: string;
      garmentPhotoType?: string;
    } = {
      garmentImageUrl,
      garmentCategory,
      garmentPhotoType,
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Upload + Model Selection */}
      <div className="lg:col-span-2 space-y-6">
        {/* Section 1: Upload Your Product Image */}
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Your Product Image</CardTitle>
            <CardDescription>
              Upload a clear, high-resolution image of your product. Supported formats: JPG, PNG.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG (MAX. 10MB)
                </p>
              </label>
            </div>

            {/* Filters + larger uploaded image preview (bottom: filters left, preview right) */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
              <div className="space-y-4">
                {/* Garment type for better try-on accuracy */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Garment type</label>
                  <Select
                    value={garmentCategory}
                    onValueChange={(v) => setGarmentCategory(v as "auto" | "tops" | "bottoms" | "one-pieces")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="tops">Tops</SelectItem>
                      <SelectItem value="bottoms">Bottoms</SelectItem>
                      <SelectItem value="one-pieces">One-piece</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Helps the AI fit your garment more accurately.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Garment photo style</label>
                  <Select
                    value={garmentPhotoType}
                    onValueChange={(v) => setGarmentPhotoType(v as "auto" | "flat-lay" | "model")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="flat-lay">Flat-lay</SelectItem>
                      <SelectItem value="model">On model</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Larger uploaded image preview — bottom right alongside filters */}
              <AnimatePresence>
                {uploadedFile && garmentImageUrl ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-end gap-2"
                  >
                    <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-lg overflow-hidden border-2 border-muted bg-muted/30 shadow-sm">
                      <Image
                        src={garmentImageUrl}
                        alt={uploadedFile.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="absolute top-1.5 right-1.5 h-8 w-8 rounded-full shadow-md opacity-90 hover:opacity-100"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right max-w-[11rem] sm:max-w-[13rem]">
                      <p className="text-sm font-medium truncate" title={uploadedFile.name}>
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Choose Your Model */}
        <Card>
          <CardHeader>
            <CardTitle>2. Choose Your Model</CardTitle>
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

              <TabsContent value="ai" className="mt-6">
                {/* Gender filter for AI models */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-muted-foreground self-center">Show:</span>
                  <Button
                    type="button"
                    variant={avatarGenderFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAvatarGenderFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant={avatarGenderFilter === "female" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAvatarGenderFilter("female")}
                  >
                    Female
                  </Button>
                  <Button
                    type="button"
                    variant={avatarGenderFilter === "male" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAvatarGenderFilter("male")}
                  >
                    Male
                  </Button>
                </div>
                {avatarsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {avatarsData?.map((avatar: Avatar) => (
                      <motion.button
                        key={avatar._id}
                        onClick={() => setSelectedAvatar(avatar)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all",
                          selectedAvatar?._id === avatar._id
                            ? "border-primary ring-2 ring-primary"
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <Image
                          src={avatar.imageUrl}
                          alt={avatar.name || [avatar.bodyType, avatar.skinTone].filter(Boolean).join(" ") || "AI Avatar"}
                          fill
                          className="object-contain"
                        />
                        <AnimatePresence>
                          {selectedAvatar?._id === avatar._id && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute top-2 right-2 bg-primary rounded-full p-1"
                            >
                              <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="human" className="mt-6">
                {/* Coming soon: Human models selection — data display commented out
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {modelsData?.map((model: Model) => (
                      <motion.button ... />
                    ))}
                  </div>
                )}
                */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-10 text-center overflow-hidden"
                >
                  <div className="relative">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Human Models — Coming Soon
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                      Try on your garments with verified human models. Browse the marketplace, request consent, and generate with real models — launching soon.
                    </p>
                    <Link href="/dashboard/business/models">
                      <Button variant="outline" size="sm" className="rounded-full">
                        Browse marketplace
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Preview Pane + Generate Button (sticky together so button is always under card) */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Generated Image</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {renderMutation.isPending ? (
                // Loading Animation
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border bg-gradient-to-br from-muted via-muted/50 to-muted mb-6">
                    {/* Animated background shimmer */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    
                    {/* Floating magic wand icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{
                          y: [0, -10, 0],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Wand2 className="w-16 h-16 text-primary" />
                      </motion.div>
                    </div>

                    {/* Pulsing dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-sm font-medium mb-2">Generating your image...</p>
                    <p className="text-xs text-muted-foreground">
                      This may take a few moments
                    </p>
                  </motion.div>
                </motion.div>
              ) : generatedImageUrl ? (
                // Generated Image
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative w-full aspect-square rounded-lg overflow-hidden border bg-muted"
                  >
                    <Image
                      src={generatedImageUrl}
                      alt="Generated fashion image"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    {/* Download button */}
                    {generationType === "human" && isPurchased === false ? (
                      <Button
                        variant="outline"
                        disabled
                        className="w-full"
                        title="Purchase model access to download"
                      >
                        Download (Purchase Required)
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={async () => {
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
                        className="w-full"
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
                        className="w-full"
                      >
                        Purchase Model Access
                      </Button>
                    )}
                    
                    <Button asChild className="w-full">
                      <Link href="/dashboard/business/history">View History</Link>
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                // Placeholder
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <motion.div
                    animate={{
                      y: [0, -5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4"
                  >
                    <Mountain className="w-12 h-12 text-muted-foreground" />
                  </motion.div>
                  <p className="text-sm font-medium mb-2">Your generated image will appear here</p>
                  <p className="text-xs text-muted-foreground">
                    Complete the steps on the left to begin.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Generate Button — under right-side card */}
        <motion.div
          whileHover={
            !renderMutation.isPending &&
            garmentImageUrl &&
            ((modelType === "ai" && selectedAvatar) || (modelType === "human" && selectedModel))
              ? { scale: 1.02 }
              : {}
          }
          whileTap={
            !renderMutation.isPending &&
            garmentImageUrl &&
            ((modelType === "ai" && selectedAvatar) || (modelType === "human" && selectedModel))
              ? { scale: 0.98 }
              : {}
          }
        >
          <Button
            onClick={handleGenerate}
            disabled={
              !garmentImageUrl ||
              renderMutation.isPending ||
              (modelType === "ai" && !selectedAvatar) ||
              (modelType === "human" && !selectedModel)
            }
            className="w-full"
            size="lg"
          >
            {renderMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Image"
            )}
          </Button>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
