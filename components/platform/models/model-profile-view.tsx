"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Star,
  TrendingUp,
  Eye,
  ShoppingBag,
  Sparkles,
  User,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react";
import { ConsentRequestDialog } from "./consent-request-dialog";
import { toast } from "sonner";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface ModelProfile {
  _id: string;
  name: string;
  displayName?: string;
  bio?: string;
  primaryPhoto?: string;
  referencePhotos?: string[];
  referenceImages?: string[];
  status: string;
  activeness?: string;
  royaltyBalance: number;
  price?: number;
  pricePerAccess?: number;
  currency?: string;
  consentRequired?: boolean;
  requiresConsent?: boolean;
  specialties?: {
    clothingCategories?: string[];
    modelingStyles?: string[];
  };
  totalEarnings?: number;
  availableBalance?: number;
  totalPurchases?: number;
  totalGenerations?: number;
  profileViews?: number;
  userId: {
    firstName?: string;
    lastName?: string;
    picture?: string;
    emailAddress?: string[];
  };
}

interface ConsentStatus {
  hasConsent: boolean;
  status: "APPROVED" | "PENDING" | "REJECTED" | "NO_REQUEST";
}

// Photo Lightbox Component
function PhotoLightbox({
  images,
  currentIndex,
  open,
  onOpenChange,
  onIndexChange,
}: {
  images: string[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}) {
  const currentImage = images[currentIndex];

  const handlePrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onIndexChange(newIndex);
  }, [currentIndex, images.length, onIndexChange]);

  const handleNext = useCallback(() => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  }, [currentIndex, images.length, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrevious, handleNext, onOpenChange]);

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
        <div className="relative w-full h-[90vh] bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <Image
                src={currentImage}
                alt={`Photo ${currentIndex + 1}`}
                fill
                className="object-contain"
                unoptimized
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90%] overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => onIndexChange(idx)}
                  className={`relative w-16 h-16 rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                    idx === currentIndex
                      ? "border-white scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ModelProfileView({ modelId }: { modelId: string }) {
  const router = useRouter();
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<{ isPurchased: boolean; price?: number } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchModelProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/models/${modelId}`);
      const data = await response.json();

      if (data.status === "success") {
        setModel(data.data);
      } else {
        toast.error(data.message || "Failed to load model profile");
      }
    } catch (error) {
      toast.error("Failed to load model profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  const checkConsentStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/consent?type=sent`);
      const data = await response.json();

      if (data.status === "success") {
        const requests = data.data.requests || [];
        const request = requests.find(
          (r: any) => r.modelId?._id === modelId || r.modelId?._id?.toString() === modelId
        );

        if (request) {
          setConsentStatus({
            hasConsent: request.status === "APPROVED",
            status: request.status,
          });
        } else {
          setConsentStatus({ hasConsent: false, status: "NO_REQUEST" });
        }
      }
    } catch (error) {
      console.error("Failed to check consent status:", error);
    }
  }, [modelId]);

  const checkPurchaseStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/models/${modelId}/purchase-status`);
      const data = await response.json();
      if (data.status === "success") {
        setPurchaseStatus({
          isPurchased: data.data?.isPurchased || false,
          price: data.data?.price,
        });
      }
    } catch (error) {
      console.error("Failed to check purchase status:", error);
    }
  }, [modelId]);

  useEffect(() => {
    fetchModelProfile();
    checkConsentStatus();
    checkPurchaseStatus();
  }, [fetchModelProfile, checkConsentStatus, checkPurchaseStatus]);

  const handleConsentRequest = async () => {
    setShowDialog(true);
  };

  const handleRequestSuccess = () => {
    checkConsentStatus();
    setShowDialog(false);
    toast.success("Consent request sent successfully!");
  };

  const handlePurchase = async () => {
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
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Model profile not found</p>
        <Button onClick={() => router.back()} className="mt-4" variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Get all photos (primary + reference)
  const allPhotos: string[] = [];
  if (model.primaryPhoto) allPhotos.push(model.primaryPhoto);
  if (model.referencePhotos && model.referencePhotos.length > 0) {
    allPhotos.push(...model.referencePhotos);
  }
  // Fallback to referenceImages if new fields are not available
  if (allPhotos.length === 0 && model.referenceImages && model.referenceImages.length > 0) {
    allPhotos.push(...model.referenceImages);
  }

  const displayName = model.displayName || model.name;
  const price = model.pricePerAccess || model.price || 0;
  const requiresConsent = model.requiresConsent ?? model.consentRequired ?? false;
  const status = model.activeness || model.status;

  const getStatusBadge = () => {
    if (!consentStatus) return null;

    switch (consentStatus.status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number, currency: string = "usd") => {
    const currencySymbols: Record<string, string> = {
      usd: "$",
      eur: "€",
      gbp: "£",
      lkr: "Rs.",
    };
    const symbol = currencySymbols[currency.toLowerCase()] || "$";
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const formatCategory = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button onClick={() => router.back()} variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">Model Portfolio</p>
        </div>
        <Badge variant={status === "active" ? "default" : "secondary"} className="text-sm">
          {status}
        </Badge>
      </motion.div>

      {/* Hero Section with Primary Photo */}
      {model.primaryPhoto && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/9] bg-muted group cursor-pointer" onClick={() => openLightbox(0)}>
              <Image
                src={model.primaryPhoto}
                alt={displayName}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-white">
                  <ZoomIn className="h-5 w-5" />
                  <span className="text-sm font-medium">Click to view full size</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio Section */}
          {model.bio && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{model.bio}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Specialties */}
          {model.specialties && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Specialties
                  </CardTitle>
                  <CardDescription>Modeling categories and styles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {model.specialties.clothingCategories && model.specialties.clothingCategories.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Clothing Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {model.specialties.clothingCategories.map((category, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {formatCategory(category)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {model.specialties.modelingStyles && model.specialties.modelingStyles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Modeling Styles</h4>
                      <div className="flex flex-wrap gap-2">
                        {model.specialties.modelingStyles.map((style, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {formatCategory(style)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Photo Gallery */}
          {allPhotos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Photo Gallery
                  </CardTitle>
                  <CardDescription>{allPhotos.length} reference photos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {allPhotos.map((photo, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * index }}
                        className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                        onClick={() => openLightbox(index)}
                      >
                        <Image
                          src={photo}
                          alt={`Reference ${index + 1}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-110"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/50 rounded-full p-1.5">
                            <ZoomIn className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Model Info Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Model Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={model.userId?.picture} />
                    <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {model.userId?.firstName} {model.userId?.lastName}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  {price > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(price, model.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Statistics */}
          {(model.totalPurchases || model.totalGenerations || model.profileViews) && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {model.totalPurchases !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Purchases</span>
                      </div>
                      <span className="font-semibold">{model.totalPurchases}</span>
                    </div>
                  )}
                  {model.totalGenerations !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Generations</span>
                      </div>
                      <span className="font-semibold">{model.totalGenerations}</span>
                    </div>
                  )}
                  {model.profileViews !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Profile Views</span>
                      </div>
                      <span className="font-semibold">{model.profileViews}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Consent & Purchase Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Access & Consent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Consent Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Consent Status:</span>
                    {getStatusBadge()}
                  </div>

                  {consentStatus?.status === "NO_REQUEST" && (
                    <Button onClick={handleConsentRequest} className="w-full" size="sm">
                      <Building2 className="h-4 w-4 mr-2" />
                      Request Consent
                    </Button>
                  )}

                  {consentStatus?.status === "APPROVED" && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400">
                        ✓ You have consent to use this model
                      </p>
                    </div>
                  )}

                  {consentStatus?.status === "PENDING" && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        ⏳ Your consent request is pending approval
                      </p>
                    </div>
                  )}

                  {consentStatus?.status === "REJECTED" && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        ✗ Your consent request was rejected
                      </p>
                    </div>
                  )}
                </div>

                {/* Purchase Status */}
                {purchaseStatus && (
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Purchase Status:</span>
                      {purchaseStatus.isPurchased ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Purchased
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Purchased</Badge>
                      )}
                    </div>

                    {!purchaseStatus.isPurchased && price > 0 && (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                            Purchase this model to download non-watermarked images.
                          </p>
                          <p className="text-sm font-semibold">
                            Price: {formatCurrency(price, model.currency)}
                          </p>
                        </div>
                        {(!requiresConsent || consentStatus?.status === "APPROVED") ? (
                          <Button onClick={handlePurchase} className="w-full" size="sm">
                            <ShoppingBag className="h-4 w-4 mr-2" />
                            Purchase Model Access
                          </Button>
                        ) : (
                          <Button disabled className="w-full" variant="outline" size="sm">
                            Request Consent First
                          </Button>
                        )}
                      </div>
                    )}

                    {purchaseStatus.isPurchased && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400">
                          ✓ You have purchased access. Download non-watermarked images.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Photo Lightbox */}
      {allPhotos.length > 0 && (
        <PhotoLightbox
          images={allPhotos}
          currentIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          onIndexChange={setLightboxIndex}
        />
      )}

      {/* Consent Request Dialog */}
      <ConsentRequestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        modelId={modelId}
        modelName={displayName}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}
