"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadGarmentProps {
  onUploadComplete?: (imageUrl: string) => void;
  className?: string;
}

export function UploadGarment({ onUploadComplete, className }: UploadGarmentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError("File size exceeds 10MB limit.");
        return;
      }

      setIsUploading(true);
      setError(null);

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

        const imageUrl = data.data.url;
        setUploadedImage(imageUrl);
        onUploadComplete?.(imageUrl);
      } catch (err) {
        setError((err as Error).message || "Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setUploadedImage(null);
    setError(null);
  }, []);

  if (uploadedImage) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Garment Image</CardTitle>
          <CardDescription>Uploaded successfully</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded garment"
              className="w-full h-auto rounded-lg border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Upload Garment</CardTitle>
        <CardDescription>
          Upload a photo of the clothing item you want to render (JPEG, PNG, or WebP, max 10MB)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drag and drop your image here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports JPEG, PNG, WebP (max 10MB)
              </p>
              <Input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInput}
                className="hidden"
                id="garment-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="garment-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </label>
              </Button>
            </>
          )}
        </div>
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

