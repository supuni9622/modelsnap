"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2, Clock, XCircle, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface Model {
  _id: string;
  name: string;
  referenceImages: string[];
  status: string;
  royaltyBalance: number;
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

export function ModelMarketplace() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);

  useEffect(() => {
    fetchModels();
  }, []);

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

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/models?status=active");
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
  };

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
      <div>
        <h1 className="text-3xl font-bold">Model Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Browse and select human models for your fashion photography
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

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
            <Card key={model._id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-[4/3] bg-muted">
                {model.referenceImages?.[0] && (
                  <Image
                    src={model.referenceImages[0]}
                    alt={model.name}
                    fill
                    className="object-cover"
                  />
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
                  <span className="font-medium">{model.referenceImages?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Royalty per Generation:</span>
                  <span className="font-semibold text-green-600">$2.00</span>
                </div>
                <Button asChild className="w-full" variant={model.consentStatus?.hasConsent ? "default" : "outline"}>
                  <Link href={`/dashboard/business/models/${model._id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    {model.consentStatus?.hasConsent ? "View Profile" : "View & Request Consent"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">$</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                How It Works
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Browse available models in the marketplace</li>
                <li>• Request consent from models you want to use</li>
                <li>• Once approved, generate images for $2.00 per generation</li>
                <li>• Models receive royalties for each generation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

