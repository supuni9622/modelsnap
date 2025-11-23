"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
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

interface PortfolioData {
  name: string;
  displayName: string;
  bio: string;
  primaryPhoto: string | null;
  referencePhotos: string[];
  clothingCategories: string[];
  modelingStyles: string[];
  pricePerAccess: number;
  currency: string;
  requiresConsent: boolean;
}

const CLOTHING_CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "activewear",
  "outerwear",
  "swimwear",
  "one-pieces",
  "accessories",
] as const;

const MODELING_STYLES = [
  "lifestyle",
  "e-commerce",
  "editorial",
  "fitness",
  "formal",
  "casual",
] as const;

export function ModelPortfolioEdit() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    name: "",
    displayName: "",
    bio: "",
    primaryPhoto: null,
    referencePhotos: [],
    clothingCategories: [],
    modelingStyles: [],
    pricePerAccess: 50,
    currency: "usd",
    requiresConsent: true,
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch("/api/model/profile");
      const data = await response.json();

      if (data.status === "success" && data.data) {
        const profile = data.data;
        setPortfolioData({
          name: profile.name || "",
          displayName: profile.displayName || profile.name || "",
          bio: profile.bio || "",
          primaryPhoto: profile.primaryPhoto || null,
          referencePhotos: profile.referencePhotos || [],
          clothingCategories: profile.specialties?.clothingCategories || [],
          modelingStyles: profile.specialties?.modelingStyles || [],
          pricePerAccess: profile.pricePerAccess || profile.price || 50,
          currency: profile.currency || "usd",
          requiresConsent: profile.requiresConsent !== undefined ? profile.requiresConsent : true,
        });
      }
    } catch (error) {
      toast.error("Failed to load portfolio");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback(
    async (file: File, isPrimary: boolean) => {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File size exceeds 10MB limit.");
        return;
      }

      if (!isPrimary && portfolioData.referencePhotos.length >= 4) {
        toast.error("Maximum 4 reference photos allowed.");
        return;
      }

      setIsUploading(true);

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
          setPortfolioData((prev) => ({ ...prev, primaryPhoto: imageUrl }));
        } else {
          setPortfolioData((prev) => ({
            ...prev,
            referencePhotos: [...prev.referencePhotos, imageUrl],
          }));
        }

        toast.success("Image uploaded successfully");
      } catch (err) {
        toast.error((err as Error).message || "Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [portfolioData.referencePhotos.length]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: portfolioData.name.trim(),
        displayName: portfolioData.displayName.trim() || portfolioData.name.trim(),
        bio: portfolioData.bio.trim(),
        primaryPhoto: portfolioData.primaryPhoto,
        referencePhotos: portfolioData.referencePhotos,
        specialties: {
          clothingCategories: portfolioData.clothingCategories,
          modelingStyles: portfolioData.modelingStyles,
        },
        pricePerAccess: portfolioData.pricePerAccess,
        currency: portfolioData.currency,
        requiresConsent: portfolioData.requiresConsent,
      };

      const response = await fetch("/api/model/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Portfolio updated successfully!");
        router.refresh();
      } else {
        toast.error(data.message || "Failed to update portfolio");
      }
    } catch (error) {
      toast.error("Failed to update portfolio");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Portfolio</h1>
        <p className="text-muted-foreground mt-2">Update your portfolio information</p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your public profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Model Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={portfolioData.name}
              onChange={(e) =>
                setPortfolioData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Public)</Label>
            <Input
              id="displayName"
              value={portfolioData.displayName}
              onChange={(e) =>
                setPortfolioData((prev) => ({ ...prev, displayName: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={portfolioData.bio}
              onChange={(e) =>
                setPortfolioData((prev) => ({ ...prev, bio: e.target.value }))
              }
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{portfolioData.bio.length}/500 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>Your primary photo and reference photos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Photo */}
          <div>
            <Label className="mb-4 block">Primary Photo</Label>
            {portfolioData.primaryPhoto ? (
              <div className="relative aspect-[3/4] max-w-xs rounded-lg overflow-hidden border group">
                <Image
                  src={portfolioData.primaryPhoto}
                  alt="Primary photo"
                  fill
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() =>
                    setPortfolioData((prev) => ({ ...prev, primaryPhoto: null }))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file, true);
                }}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isUploading
                    ? "border-primary bg-primary/5 opacity-50 pointer-events-none"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer"
                )}
              >
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, true);
                  }}
                  className="hidden"
                  id="primary-upload"
                />
                <label htmlFor="primary-upload" className="cursor-pointer">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">Click to upload primary photo</p>
                </label>
              </div>
            )}
          </div>

          {/* Reference Photos */}
          <div>
            <Label className="mb-4 block">Reference Photos ({portfolioData.referencePhotos.length}/4)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {portfolioData.referencePhotos.map((photo, index) => (
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
                    onClick={() =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        referencePhotos: prev.referencePhotos.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {portfolioData.referencePhotos.length < 4 && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(file, false);
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-lg aspect-square flex items-center justify-center transition-colors",
                    isUploading
                      ? "border-primary bg-primary/5 opacity-50 pointer-events-none"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer"
                  )}
                >
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, false);
                    }}
                    className="hidden"
                    id="reference-upload"
                  />
                  <label htmlFor="reference-upload" className="cursor-pointer text-center p-4">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload</p>
                  </label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specialties */}
      <Card>
        <CardHeader>
          <CardTitle>Specialties</CardTitle>
          <CardDescription>What you specialize in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-4 block">Clothing Categories</Label>
            <div className="grid grid-cols-2 gap-4">
              {CLOTHING_CATEGORIES.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={portfolioData.clothingCategories.includes(category)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPortfolioData((prev) => ({
                          ...prev,
                          clothingCategories: [...prev.clothingCategories, category],
                        }));
                      } else {
                        setPortfolioData((prev) => ({
                          ...prev,
                          clothingCategories: prev.clothingCategories.filter((c) => c !== category),
                        }));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="text-sm font-normal cursor-pointer capitalize"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-4 block">Modeling Styles</Label>
            <div className="grid grid-cols-2 gap-4">
              {MODELING_STYLES.map((style) => (
                <div key={style} className="flex items-center space-x-2">
                  <Checkbox
                    id={`style-${style}`}
                    checked={portfolioData.modelingStyles.includes(style)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPortfolioData((prev) => ({
                          ...prev,
                          modelingStyles: [...prev.modelingStyles, style],
                        }));
                      } else {
                        setPortfolioData((prev) => ({
                          ...prev,
                          modelingStyles: prev.modelingStyles.filter((s) => s !== style),
                        }));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`style-${style}`}
                    className="text-sm font-normal cursor-pointer capitalize"
                  >
                    {style}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Set your access rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select
              value={portfolioData.currency}
              onValueChange={(value) =>
                setPortfolioData((prev) => ({ ...prev, currency: value }))
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD</SelectItem>
                <SelectItem value="lkr">LKR</SelectItem>
                <SelectItem value="eur">EUR</SelectItem>
                <SelectItem value="gbp">GBP</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={10}
              max={500}
              value={portfolioData.pricePerAccess}
              onChange={(e) =>
                setPortfolioData((prev) => ({
                  ...prev,
                  pricePerAccess: Number(e.target.value),
                }))
              }
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Consent */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Settings</CardTitle>
          <CardDescription>How brands can work with you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires-consent"
              checked={portfolioData.requiresConsent}
              onCheckedChange={(checked) =>
                setPortfolioData((prev) => ({ ...prev, requiresConsent: checked === true }))
              }
            />
            <Label htmlFor="requires-consent" className="cursor-pointer">
              Require approval before brands can purchase access
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
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
    </form>
  );
}

