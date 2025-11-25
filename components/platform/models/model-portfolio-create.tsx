"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Step1Welcome } from "./portfolio-steps/step-1-welcome";
import { Step2Photos } from "./portfolio-steps/step-2-photos";
import { Step3Specialties } from "./portfolio-steps/step-3-specialties";
import { Step4Pricing } from "./portfolio-steps/step-4-pricing";
import { Step5Consent } from "./portfolio-steps/step-5-consent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PortfolioFormData {
  // Step 1
  name: string;
  displayName: string;
  bio: string;
  // Step 2
  primaryPhoto: string | null;
  referencePhotos: string[];
  // Step 3
  clothingCategories: string[];
  modelingStyles: string[];
  // Step 4
  pricePerAccess: number;
  currency: string;
  // Step 5
  requiresConsent: boolean;
  consentSigned: boolean;
}

const INITIAL_FORM_DATA: PortfolioFormData = {
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
  consentSigned: false,
};

export function ModelPortfolioCreate() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // All form data stored in state - persists across step navigation
  const [formData, setFormData] = useState<PortfolioFormData>(INITIAL_FORM_DATA);

  const updateFormData = <K extends keyof PortfolioFormData>(
    key: K,
    value: PortfolioFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error("Name is required");
        setCurrentStep(1);
        return;
      }

      if (!formData.primaryPhoto) {
        toast.error("Primary photo is required");
        setCurrentStep(2);
        return;
      }

      if (formData.referencePhotos.length < 3) {
        toast.error("At least 3 reference photos are required");
        setCurrentStep(2);
        return;
      }

      if (formData.clothingCategories.length === 0) {
        toast.error("At least one clothing category is required");
        setCurrentStep(3);
        return;
      }

      if (!formData.consentSigned) {
        toast.error("You must agree to the terms");
        setCurrentStep(5);
        return;
      }

      // Prepare data for API
      const payload = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim() || formData.name.trim(),
        bio: formData.bio.trim(),
        primaryPhoto: formData.primaryPhoto,
        referencePhotos: formData.referencePhotos,
        specialties: {
          clothingCategories: formData.clothingCategories,
          modelingStyles: formData.modelingStyles,
        },
        pricePerAccess: formData.pricePerAccess,
        currency: formData.currency,
        requiresConsent: formData.requiresConsent,
        consentSigned: formData.consentSigned,
        consentSignedAt: formData.consentSigned ? new Date().toISOString() : undefined,
        status: "active",
        isVisible: true,
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
        toast.success("🎉 Portfolio created successfully!");
        router.push("/dashboard/model/portfolio");
        router.refresh();
      } else {
        toast.error(data.message || "Failed to create portfolio");
      }
    } catch (error) {
      toast.error("Failed to create portfolio");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Creating your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentStep === 1 && (
        <Step1Welcome
          name={formData.name}
          displayName={formData.displayName}
          bio={formData.bio}
          onNameChange={(value) => updateFormData("name", value)}
          onDisplayNameChange={(value) => updateFormData("displayName", value)}
          onBioChange={(value) => updateFormData("bio", value)}
          onNext={handleNext}
        />
      )}

      {currentStep === 2 && (
        <Step2Photos
          primaryPhoto={formData.primaryPhoto}
          referencePhotos={formData.referencePhotos}
          onPrimaryPhotoChange={(value) => updateFormData("primaryPhoto", value)}
          onReferencePhotosChange={(value) => updateFormData("referencePhotos", value)}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}

      {currentStep === 3 && (
        <Step3Specialties
          clothingCategories={formData.clothingCategories}
          modelingStyles={formData.modelingStyles}
          onClothingCategoriesChange={(value) => updateFormData("clothingCategories", value)}
          onModelingStylesChange={(value) => updateFormData("modelingStyles", value)}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}

      {currentStep === 4 && (
        <Step4Pricing
          pricePerAccess={formData.pricePerAccess}
          currency={formData.currency}
          onPricePerAccessChange={(value) => updateFormData("pricePerAccess", value)}
          onCurrencyChange={(value) => updateFormData("currency", value)}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}

      {currentStep === 5 && (
        <Step5Consent
          requiresConsent={formData.requiresConsent}
          consentSigned={formData.consentSigned}
          onRequiresConsentChange={(value) => updateFormData("requiresConsent", value)}
          onConsentSignedChange={(value) => updateFormData("consentSigned", value)}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

