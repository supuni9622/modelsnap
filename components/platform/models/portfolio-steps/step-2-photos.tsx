"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Step2PhotosProps {
  primaryPhoto: string | null;
  referencePhotos: string[];
  onPrimaryPhotoChange: (url: string | null) => void;
  onReferencePhotosChange: (urls: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface UploadedImage {
  url: string;
  file?: File;
}

export function Step2Photos({
  primaryPhoto,
  referencePhotos,
  onPrimaryPhotoChange,
  onReferencePhotosChange,
  onNext,
  onBack,
}: Step2PhotosProps) {
  const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
  const [isUploadingReference, setIsUploadingReference] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File, isPrimary: boolean) => {
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

      if (isPrimary) {
        setIsUploadingPrimary(true);
      } else {
        if (referencePhotos.length >= 4) {
          toast.error("Maximum 4 reference photos allowed.");
          return;
        }
        setIsUploadingReference(true);
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload?type=model-reference", {
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
            headers: {
              "Content-Type": file.type,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload to S3");
          }

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
          imageUrl = data.data.url;
        }

        if (isPrimary) {
          onPrimaryPhotoChange(imageUrl);
        } else {
          onReferencePhotosChange([...referencePhotos, imageUrl]);
        }

        toast.success("Image uploaded successfully");
      } catch (err) {
        toast.error((err as Error).message || "Failed to upload image");
      } finally {
        if (isPrimary) {
          setIsUploadingPrimary(false);
        } else {
          setIsUploadingReference(false);
        }
      }
    },
    [referencePhotos, onPrimaryPhotoChange, onReferencePhotosChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, isPrimary: boolean) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file, isPrimary);
      }
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, isPrimary: boolean) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file, isPrimary);
      }
    },
    [handleFileUpload]
  );

  const removePrimaryPhoto = () => {
    onPrimaryPhotoChange(null);
  };

  const removeReferencePhoto = (index: number) => {
    onReferencePhotosChange(referencePhotos.filter((_, i) => i !== index));
  };

  const canContinue = primaryPhoto !== null && referencePhotos.length >= 3;
  const totalPhotos = (primaryPhoto ? 1 : 0) + referencePhotos.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <span className="ml-2 text-sm text-muted-foreground">(2/5)</span>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">📸 Upload Your Reference Photos</h2>
        <p className="text-muted-foreground">
          These photos will be used to create your AI likeness. Upload 3-4 clear photos showing
          different angles.
        </p>
      </div>

      {/* Primary Photo Upload */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Primary Photo (Front-Facing Hero Shot)</h3>
          {primaryPhoto ? (
            <div className="relative aspect-[3/4] max-w-xs mx-auto rounded-lg overflow-hidden border group">
              <Image src={primaryPhoto} alt="Primary photo" fill className="object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={removePrimaryPhoto}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, true)}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                isUploadingPrimary
                  ? "border-primary bg-primary/5 opacity-50 pointer-events-none"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer"
              )}
            >
              {isUploadingPrimary ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    Drag and drop your primary photo here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports JPEG, PNG, WebP (max 10MB)
                  </p>
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handleFileInput(e, true)}
                    className="hidden"
                    id="primary-upload"
                  />
                  <Button asChild variant="outline" type="button">
                    <label htmlFor="primary-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </label>
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Photos Upload */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">
            Additional Reference Photos ({referencePhotos.length}/4)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {referencePhotos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border group"
              >
                <Image src={photo} alt={`Reference ${index + 1}`} fill className="object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeReferencePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}

            {referencePhotos.length < 4 && (
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, false)}
                className={cn(
                  "border-2 border-dashed rounded-lg aspect-square flex items-center justify-center transition-colors relative",
                  isUploadingReference
                    ? "border-primary bg-primary/5 opacity-50 pointer-events-none"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer"
                )}
              >
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleFileInput(e, false)}
                  className="hidden"
                  id={`reference-upload-${referencePhotos.length}`}
                />
                {isUploadingReference ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <label
                    htmlFor={`reference-upload-${referencePhotos.length}`}
                    className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
                  >
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload</p>
                  </label>
                )}
              </div>
            )}
          </div>
          {referencePhotos.length < 3 && (
            <p className="text-sm text-muted-foreground mt-4">
              {3 - referencePhotos.length} more photo{3 - referencePhotos.length !== 1 ? "s" : ""}{" "}
              required
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="font-semibold">✅ Requirements for Best Results:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Well-lit photos</li>
              <li>Different angles (front, side)</li>
              <li>Natural poses</li>
              <li>Minimal makeup/filters</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              💡 Tip: High-quality photos result in better AI generations!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continue →
        </Button>
      </div>
    </div>
  );
}

