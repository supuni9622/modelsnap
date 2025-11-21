"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Trash2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ModelProfile {
  _id: string;
  name: string;
  referenceImages: string[];
  status: "active" | "paused" | "inactive";
  consentSigned: boolean;
}

interface UploadedImage {
  url: string;
  file?: File;
  isExisting?: boolean;
}

export function ModelProfileEdit() {
  const router = useRouter();
  const [modelProfile, setModelProfile] = useState<ModelProfile | null>(null);
  const [name, setName] = useState("");
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<"active" | "paused" | "inactive">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  useEffect(() => {
    fetchModelProfile();
  }, []);

  const fetchModelProfile = async () => {
    try {
      const response = await fetch("/api/model/profile");
      const data = await response.json();

      if (data.status === "success") {
        const profile = data.data;
        setModelProfile(profile);
        setName(profile.name || "");
        setStatus(profile.status || "active");
        // Convert existing images to UploadedImage format
        setReferenceImages(
          (profile.referenceImages || []).map((url: string) => ({
            url,
            isExisting: true,
          }))
        );
      } else {
        toast.error(data.message || "Failed to load model profile");
        router.push("/app/model/dashboard");
      }
    } catch (error) {
      toast.error("Failed to load model profile");
      console.error(error);
      router.push("/app/model/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File size exceeds 10MB limit.");
        return;
      }

      // Check if we already have 4 images
      if (referenceImages.length >= 4) {
        toast.error("Maximum 4 reference images allowed.");
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        // Step 1: Get pre-signed URL or upload endpoint
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

        // Check if S3 pre-signed URL is returned
        if (data.data.uploadUrl && data.data.method === "PUT") {
          // Step 2: Upload directly to S3
          const fileBuffer = await file.arrayBuffer();
          const uploadResponse = await fetch(data.data.uploadUrl, {
            method: "PUT",
            body: fileBuffer,
            headers: {
              "Content-Type": file.type,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload to S3");
          }

          // Step 3: Confirm upload and get public URL
          const confirmResponse = await fetch("/api/upload/confirm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ s3Key: data.data.s3Key }),
          });

          const confirmData = await confirmResponse.json();

          if (!confirmResponse.ok || confirmData.status !== "success") {
            throw new Error(confirmData.message || "Failed to confirm upload");
          }

          imageUrl = confirmData.data.url;
        } else {
          // Local filesystem storage
          imageUrl = data.data.url;
        }

        setReferenceImages((prev) => [...prev, { url: imageUrl, file }]);
        toast.success("Image uploaded successfully");
      } catch (err) {
        toast.error((err as Error).message || "Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [referenceImages.length]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const removeImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (referenceImages.length < 3) {
      setError("At least 3 reference images are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/models/${modelProfile?._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          referenceImages: referenceImages.map((img) => img.url),
          status,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Model profile updated successfully!");
        router.push("/app/model/dashboard");
      } else {
        setError(data.message || "Failed to update model profile");
        toast.error(data.message || "Failed to update model profile");
      }
    } catch (err) {
      setError("Failed to update model profile");
      toast.error("Failed to update model profile");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const response = await fetch(`/api/models/${modelProfile?._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "inactive",
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Model profile deactivated successfully");
        router.push("/app/model/dashboard");
      } else {
        toast.error(data.message || "Failed to deactivate model profile");
      }
    } catch (err) {
      toast.error("Failed to deactivate model profile");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!modelProfile) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Model Profile</h1>
          <p className="text-muted-foreground mt-2">
            Update your profile information and reference images
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <Card>
          <CardHeader>
            <CardTitle>Model Name</CardTitle>
            <CardDescription>
              This is how businesses will see you in the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your model name"
              className="mt-2"
              required
            />
          </CardContent>
        </Card>

        {/* Status Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Status</CardTitle>
            <CardDescription>
              Control your visibility in the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: "active" | "paused" | "inactive") => setStatus(value)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-600" />
                    Active - Visible in marketplace
                  </div>
                </SelectItem>
                <SelectItem value="paused">
                  <div className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-yellow-600" />
                    Paused - Hidden from marketplace
                  </div>
                </SelectItem>
                <SelectItem value="inactive" disabled>
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    Inactive - Deactivated
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {status === "active" && "Your profile is visible to businesses in the marketplace"}
              {status === "paused" && "Your profile is hidden but can be reactivated anytime"}
              {status === "inactive" && "Your profile is deactivated and cannot be used"}
            </p>
          </CardContent>
        </Card>

        {/* Reference Images Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Reference Images</CardTitle>
            <CardDescription>
              Upload 3-4 images showing different angles of your face. You can replace existing images or add new ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area */}
            {referenceImages.length < 4 && (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isUploading
                    ? "border-primary bg-primary/5 opacity-50 pointer-events-none"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer"
                )}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">
                      Drag and drop an image here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Supports JPEG, PNG, WebP (max 10MB)
                    </p>
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileInput}
                      className="hidden"
                      id="reference-upload"
                    />
                    <Button asChild variant="outline" type="button">
                      <label htmlFor="reference-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </label>
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Uploaded Images Grid */}
            {referenceImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {referenceImages.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <Image
                      src={image.url}
                      alt={`Reference ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
                    {image.isExisting && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        Existing
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {referenceImages.length < 3 && (
              <p className="text-sm text-muted-foreground">
                {3 - referenceImages.length} more image{3 - referenceImages.length !== 1 ? "s" : ""} required
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={isSubmitting || status === "inactive"}>
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate Profile
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate Model Profile?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will deactivate your model profile. You will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>No longer appear in the marketplace</li>
                    <li>Not receive new consent requests</li>
                    <li>Preserve all existing generations and earnings</li>
                  </ul>
                  <p className="mt-2 font-semibold">This action can be reversed by contacting support.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || referenceImages.length < 3}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

