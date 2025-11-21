"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface UploadedImage {
  url: string;
  file: File;
}

export function ModelProfileCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
  const [consentSigned, setConsentSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (!consentSigned) {
      setError("You must agree to the consent terms");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          referenceImages: referenceImages.map((img) => img.url),
          consentSigned: true,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Model profile created successfully!");
        router.push("/app/model/dashboard");
      } else {
        setError(data.message || "Failed to create model profile");
        toast.error(data.message || "Failed to create model profile");
      }
    } catch (err) {
      setError("Failed to create model profile");
      toast.error("Failed to create model profile");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Model Profile</h1>
        <p className="text-muted-foreground mt-2">
          Set up your profile to start earning royalties from fashion brands
        </p>
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

        {/* Reference Images Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Reference Images</CardTitle>
            <CardDescription>
              Upload 3-4 images showing different angles of your face. These will be used to
              generate fashion images.
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

        {/* Consent Checkbox */}
        <Card>
          <CardHeader>
            <CardTitle>Consent Agreement</CardTitle>
            <CardDescription>
              Please read and agree to the terms before creating your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={consentSigned}
                onCheckedChange={(checked: boolean) => setConsentSigned(checked === true)}
                className="mt-1"
              />
              <Label
                htmlFor="consent"
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I agree to allow businesses to use my digital likeness for generating fashion
                images. I understand that I will receive $2.00 per generation as a royalty.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || referenceImages.length < 3 || !consentSigned}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Profile"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

