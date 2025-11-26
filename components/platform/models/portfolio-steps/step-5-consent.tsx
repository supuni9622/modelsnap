"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Step5ConsentProps {
  requiresConsent: boolean;
  consentSigned: boolean;
  onRequiresConsentChange: (value: boolean) => void;
  onConsentSignedChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function Step5Consent({
  requiresConsent,
  consentSigned,
  onRequiresConsentChange,
  onConsentSignedChange,
  onSubmit,
  onBack,
}: Step5ConsentProps) {
  const canSubmit = consentSigned;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span className="ml-2 text-sm text-muted-foreground">(5/5)</span>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">🔐 Usage Permissions</h2>
        <p className="text-muted-foreground">Choose how brands can work with you.</p>
      </div>

      {/* Consent Requirement */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Consent Requirement</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="open-access"
                    name="consent"
                    checked={!requiresConsent}
                    onChange={() => onRequiresConsentChange(false)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="open-access" className="cursor-pointer">
                    <div>
                      <div className="font-medium">Open Access</div>
                      <div className="text-xs text-muted-foreground">
                        Brands can purchase immediately (Faster approval, more sales)
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="approval-required"
                    name="consent"
                    checked={requiresConsent}
                    onChange={() => onRequiresConsentChange(true)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="approval-required" className="cursor-pointer">
                    <div>
                      <div className="font-medium">Approval Required</div>
                      <div className="text-xs text-muted-foreground">
                        You review & approve each brand (More control, better quality)
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Agreement */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">📋 By creating your profile:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>You confirm you own rights to the uploaded photos</span>
            </li>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>You authorize ModelSnap to use your likeness for AI generation</span>
            </li>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>All generated images will be watermarked to protect you</span>
            </li>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>You can revoke access anytime from your dashboard</span>
            </li>
          </ul>
          <div className="flex items-center space-x-2 mt-6">
            <Checkbox
              id="consent-agreement"
              checked={consentSigned}
              onCheckedChange={(checked) => onConsentSignedChange(checked === true)}
            />
            <Label htmlFor="consent-agreement" className="cursor-pointer">
              I agree to the terms above <span className="text-destructive">*</span>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit} size="lg" className="bg-primary">
          🎉 Create My Profile
        </Button>
      </div>
    </div>
  );
}

