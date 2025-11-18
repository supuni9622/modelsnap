"use client";

import { useState } from "react";
import { UploadGarment } from "@/components/platform/upload/upload-garment";
import { AvatarSelector } from "@/components/platform/avatar/avatar-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/context/app";
import { Loader2, Download, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Avatar {
  _id: string;
  id: string;
  gender: "male" | "female";
  bodyType: string;
  skinTone: string;
  imageUrl: string;
}

interface RenderResult {
  renderId: string;
  renderedImageUrl: string;
  status: string;
  creditsUsed: number;
  creditsRemaining: number;
}

export function RenderInterface() {
  const { billing, refreshBillingData } = useAppContext();
  const [garmentImageUrl, setGarmentImageUrl] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (imageUrl: string) => {
    setGarmentImageUrl(imageUrl);
    setError(null);
  };

  const handleAvatarSelect = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setError(null);
  };

  const handleRender = async () => {
    if (!garmentImageUrl || !selectedAvatar) {
      setError("Please upload a garment image and select an avatar");
      return;
    }

    setIsRendering(true);
    setError(null);
    setRenderResult(null);

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          garmentImageUrl,
          avatarId: selectedAvatar._id || selectedAvatar.id,
          avatarImageUrl: selectedAvatar.imageUrl, // Use avatar image URL for FASHN API
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Render failed");
      }

      setRenderResult(data.data);
      // Refresh billing data to update credits
      await refreshBillingData?.();
    } catch (err) {
      setError((err as Error).message || "Failed to render");
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (renderResult?.renderedImageUrl) {
      const link = document.createElement("a");
      link.href = renderResult.renderedImageUrl;
      link.download = `render-${renderResult.renderId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setGarmentImageUrl(null);
    setSelectedAvatar(null);
    setRenderResult(null);
    setError(null);
  };

  const canRender = garmentImageUrl && selectedAvatar && !isRendering;
  const credits = billing?.credits || 0;
  const hasCredits = credits >= 1;

  return (
    <div className="space-y-6">
      {/* Credit Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Your Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{credits}</p>
              <p className="text-sm text-muted-foreground">Credits available</p>
            </div>
            {!hasCredits && (
              <Button variant="outline" size="sm">
                Buy Credits
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <UploadGarment onUploadComplete={handleUploadComplete} />

      {/* Avatar Selector */}
      <AvatarSelector
        onSelect={handleAvatarSelect}
        selectedAvatarId={selectedAvatar?._id || selectedAvatar?.id}
      />

      {/* Render Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            {!hasCredits && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  You need at least 1 credit to render. Please purchase credits to continue.
                </p>
              </div>
            )}

            <Button
              onClick={handleRender}
              disabled={!canRender || !hasCredits}
              className="w-full"
              size="lg"
            >
              {isRendering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Render Clothing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Render Result */}
      {renderResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Render Complete
            </CardTitle>
            <CardDescription>
              Your clothing has been successfully rendered on the selected avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative rounded-lg border overflow-hidden">
              <img
                src={renderResult.renderedImageUrl}
                alt="Rendered result"
                className="w-full h-auto"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Credits used</p>
                <p className="font-semibold">{renderResult.creditsUsed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits remaining</p>
                <p className="font-semibold">{renderResult.creditsRemaining}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                New Render
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

