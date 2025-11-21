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
}

export function PreviewImageDialog({
  open,
  onOpenChange,
  imageUrl,
  imageTitle = "Preview",
  downloadFileName = "image.jpg",
}: PreviewImageDialogProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

