"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Search, CheckCircle2, Clock, XCircle, Eye, ArrowRight, HelpCircle, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Model {
  _id: string;
  name: string;
  referenceImages: string[];
  status: string;
  price?: number; // Price in cents
  userId: {
    firstName?: string;
    lastName?: string;
    picture?: string;
  };
  consentStatus?: {
    hasConsent: boolean;
    status: "APPROVED" | "PENDING" | "REJECTED" | "NO_REQUEST";
  };
}

// Model Card Component with Auto Carousel
function ModelCard({ model, getConsentBadge }: { model: Model; getConsentBadge: (model: Model) => React.ReactNode }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = model.referenceImages || [];

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden group">
        <AnimatePresence mode="wait">
          {images.length > 0 ? (
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={images[currentImageIndex]}
                alt={`${model.name} - Image ${currentImageIndex + 1}`}
                fill
                className="object-cover"
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Eye className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </AnimatePresence>

        {/* Image indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`
                  w-1.5 h-1.5 rounded-full transition-all
                  ${index === currentImageIndex ? "bg-white w-4" : "bg-white/50"}
                `}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        <div className="absolute top-2 right-2">
          {getConsentBadge(model)}
        </div>
      </div>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={model.userId?.picture} />
            <AvatarFallback>
              {model.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{model.name}</CardTitle>
            <CardDescription>
              {model.userId?.firstName} {model.userId?.lastName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Reference Images:</span>
          <span className="font-medium">{images.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-semibold text-green-600">
            {model.price ? `$${(model.price / 100).toFixed(2)}` : "Free"}
          </span>
        </div>
        <Button asChild className="w-full" variant={model.consentStatus?.hasConsent ? "default" : "outline"}>
          <Link href={`/dashboard/business/models/${model._id}`}>
            <Eye className="h-4 w-4 mr-2" />
            {model.consentStatus?.hasConsent ? "View Profile" : "View & Request Consent"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ModelMarketplace() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female" | "other">("all");
  const [framingFilter, setFramingFilter] = useState<"all" | "full-body" | "half-body" | "three-quarter" | "upper-body" | "lower-body" | "back-view">("all");
  const [aspectRatioFilter, setAspectRatioFilter] = useState<"all" | "2:3" | "1:1" | "4:5" | "16:9">("all");
  const [skinToneFilter, setSkinToneFilter] = useState<"all" | "light" | "medium" | "deep">("all");
  const [backgroundFilter, setBackgroundFilter] = useState<"all" | "indoor" | "outdoor">("all");

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "active" });
      if (genderFilter !== "all") params.set("gender", genderFilter);
      if (framingFilter !== "all") params.set("photoFraming", framingFilter);
      if (aspectRatioFilter !== "all") params.set("aspectRatio", aspectRatioFilter);
      if (skinToneFilter !== "all") params.set("skinToneCategory", skinToneFilter);
      if (backgroundFilter !== "all") params.set("background", backgroundFilter);
      const response = await fetch(`/api/models?${params.toString()}`);
      const data = await response.json();

      if (data.status === "success") {
        const modelsList = data.data.models || [];
        
        // Fetch consent status for each model
        const modelsWithConsent = await Promise.all(
          modelsList.map(async (model: Model) => {
            try {
              const consentResponse = await fetch("/api/consent?type=sent");
              const consentData = await consentResponse.json();
              
              if (consentData.status === "success") {
                const requests = consentData.data.requests || [];
                const request = requests.find(
                  (r: any) => r.modelId?._id === model._id || r.modelId?._id?.toString() === model._id
                );
                
                if (request) {
                  return {
                    ...model,
                    consentStatus: {
                      hasConsent: request.status === "APPROVED",
                      status: request.status,
                    },
                  };
                }
              }
            } catch (error) {
              console.error("Failed to check consent for model:", error);
            }
            
            return {
              ...model,
              consentStatus: {
                hasConsent: false,
                status: "NO_REQUEST" as const,
              },
            };
          })
        );
        
        setModels(modelsWithConsent);
        setFilteredModels(modelsWithConsent);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setLoading(false);
    }
  }, [genderFilter, framingFilter, aspectRatioFilter, skinToneFilter, backgroundFilter]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    // Filter models by search query
    if (searchQuery.trim()) {
      const filtered = models.filter((model) =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredModels(filtered);
    } else {
      setFilteredModels(models);
    }
  }, [searchQuery, models]);

  const getConsentBadge = (model: Model) => {
    if (!model.consentStatus) return null;

    switch (model.consentStatus.status) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Model Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Browse and select human models for your fashion photography
          </p>
        </div>
        {/* How Human Model MarketPlace Works Button - Upper Right */}
        <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all shrink-0"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              How Human Model MarketPlace Works
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-4"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-4xl">
                  ✨
                </div>
              </motion.div>
              <DialogTitle className="text-3xl font-bold text-center">
                How Human Model MarketPlace Works
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Your guide to creating stunning fashion images
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {[
                {
                  step: 1,
                  emoji: "👗",
                  title: "Browse Models",
                  description: "Explore our marketplace of AI avatars and human models. Find the perfect match for your fashion brand.",
                  color: "from-pink-500 to-rose-500",
                },
                {
                  step: 2,
                  emoji: "🤝",
                  title: "Request Consent",
                  description: "For human models, send a consent request. Once approved, you can use them for your projects.",
                  color: "from-blue-500 to-cyan-500",
                },
                {
                  step: 3,
                  emoji: "🎨",
                  title: "Generate Images",
                  description: "Upload your product images and generate stunning fashion photos. Only $2.00 per generation for human models.",
                  color: "from-purple-500 to-indigo-500",
                },
                {
                  step: 4,
                  emoji: "💰",
                  title: "Support Models",
                  description: "Models receive royalties for each generation, creating a fair and sustainable marketplace.",
                  color: "from-green-500 to-emerald-500",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="relative"
                >
                  <div className="flex gap-4 items-start">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="flex-shrink-0"
                    >
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-3xl shadow-lg`}
                      >
                        {item.emoji}
                      </div>
                    </motion.div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          STEP {item.step}
                        </span>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                          className="h-0.5 bg-gradient-to-r from-primary to-transparent"
                        />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  {index < 3 && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                      className="absolute left-8 top-20 w-0.5 h-8 bg-gradient-to-b from-primary/50 to-transparent"
                    />
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 p-6 rounded-lg bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-lg">Pro Tip</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Start with AI avatars for instant results, then explore human models for more authentic and diverse representations of your fashion brand.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center mt-6"
            >
              <Button
                onClick={() => setHowItWorksOpen(false)}
                className="min-w-[200px]"
                size="lg"
              >
                Got it! Let's get started 🚀
              </Button>
            </motion.div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coming Soon Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-8 md:p-12 text-white overflow-hidden relative"
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundSize: "200% 200%",
          }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              opacity: 0,
            }}
            animate={{
              y: [null, "-20px", "20px"],
              opacity: [0, 0.5, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}

        <div className="relative z-10 space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <motion.span
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-xs font-semibold uppercase tracking-wider"
            >
              COMING SOON
            </motion.span>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-lg"
            >
              ✨
            </motion.div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold"
          >
            Your Own Dedicated AI Model!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg md:text-xl text-white/90 max-w-2xl"
          >
            Generate unlimited, on-brand images with an AI model trained exclusively for you. Perfect consistency, every time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              className="bg-white text-orange-600 hover:bg-white/90 font-semibold mt-4 shadow-lg"
              onClick={() => {
                // TODO: Implement waitlist signup
                console.log("Join waitlist clicked");
              }}
            >
              <motion.span
                animate={{
                  x: [0, 5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Join the Waitlist
              </motion.span>
              <motion.div
                animate={{
                  x: [0, 5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ArrowRight className="ml-2 h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters: Gender & Framing (for new models from today) */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Gender:</span>
          {(["all", "female", "male", "other"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={genderFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setGenderFilter(value)}
            >
              {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Framing:</span>
          {(["all", "full-body", "half-body", "three-quarter", "upper-body", "lower-body", "back-view"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={framingFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setFramingFilter(value)}
            >
              {value === "all" ? "All" : value === "full-body" ? "Full body" : value === "half-body" ? "Half body" : value === "three-quarter" ? "Three-Quarter" : value === "upper-body" ? "Upper body" : value === "lower-body" ? "Lower body" : "Back View"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Skin tone:</span>
          {(["all", "light", "medium", "deep"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={skinToneFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setSkinToneFilter(value)}
            >
              {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Background:</span>
          {(["all", "indoor", "outdoor"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={backgroundFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setBackgroundFilter(value)}
            >
              {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Aspect ratio:</span>
          {(["all", "2:3", "1:1", "4:5", "16:9"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={aspectRatioFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setAspectRatioFilter(value)}
            >
              {value === "all" ? "All" : value === "2:3" ? "2:3 Portrait" : value === "1:1" ? "1:1 Square" : value === "4:5" ? "4:5 Vertical" : "16:9 Landscape"}
            </Button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search models by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No models found matching your search" : "No models available"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <ModelCard key={model._id} model={model} getConsentBadge={getConsentBadge} />
          ))}
        </div>
      )}

    </div>
  );
}

