"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Globe, Mail, MapPin } from "lucide-react";
import Link from "next/link";

interface BusinessProfile {
  _id: string;
  businessName: string;
  businessType?: string;
  website?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  userId: {
    firstName?: string;
    lastName?: string;
    emailAddress?: string[];
  };
}

interface BusinessProfileViewProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessProfileView({
  businessId,
  open,
  onOpenChange,
}: BusinessProfileViewProps) {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusinessProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/business/${businessId}`);
      const data = await response.json();

      if (data.status === "success") {
        setBusiness(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch business profile:", error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (open && businessId) {
      fetchBusinessProfile();
    }
  }, [open, businessId, fetchBusinessProfile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Profile
          </DialogTitle>
          <DialogDescription>
            View business information and details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : business ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{business.businessName}</CardTitle>
                {business.businessType && (
                  <CardDescription>{business.businessType}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {business.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p>{business.description}</p>
                  </div>
                )}

                {business.website && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Website</p>
                    <Link
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-4 w-4" />
                      {business.website}
                    </Link>
                  </div>
                )}

                {(business.address || business.city || business.country) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[business.address, business.city, business.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}

                {business.userId?.emailAddress?.[0] && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Contact Email</p>
                    <p className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {business.userId.emailAddress[0]}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Business profile not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

