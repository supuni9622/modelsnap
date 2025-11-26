"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import Image from "next/image";

interface PreviewImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageTitle?: string;
  downloadFileName?: string;
  generationId?: string;
  type?: "ai" | "human";
}

export function PreviewImageDialog({
  open,
  onOpenChange,
  imageUrl,
  imageTitle = "Preview",
  downloadFileName = "image.jpg",
  generationId,
  type = "ai",
}: PreviewImageDialogProps) {
  const handleDownload = async () => {
    // If generationId is provided, use the download API endpoint
    if (generationId) {
      try {
        const downloadUrl = `/api/render/download?id=${generationId}&type=${type}`;
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.code === "PURCHASE_REQUIRED") {
            alert(errorData.message || "Purchase model access to download");
            return;
          }
          throw new Error(errorData.message || "Download failed");
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download error:", error);
        alert((error as Error).message || "Failed to download image");
      }
    } else {
      // Fallback to direct download
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{imageTitle}</DialogTitle>
          <DialogDescription>Preview your generated image before downloading</DialogDescription>
        </DialogHeader>
        <div className="relative w-full h-[70vh] bg-muted rounded-lg overflow-hidden">
          <Image
            src={imageUrl}
            alt={imageTitle}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

