"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Step1WelcomeProps {
  name: string;
  displayName: string;
  bio: string;
  onNameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onNext: () => void;
}

export function Step1Welcome({
  name,
  displayName,
  bio,
  onNameChange,
  onDisplayNameChange,
  onBioChange,
  onNext,
}: Step1WelcomeProps) {
  const canContinue = name.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <span className="ml-2 text-sm text-muted-foreground">(1/5)</span>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">👋 Welcome to ModelSnapper!</h2>
        <p className="text-muted-foreground">
          Let's create your model profile. This will help fashion brands find and work with you.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">
              Model Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Public)</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder={name || "Jane D."}
            />
            <p className="text-xs text-muted-foreground">
              This is how brands will see you in the marketplace
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => onBioChange(e.target.value)}
              placeholder="Tell brands about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continue →
        </Button>
      </div>
    </div>
  );
}

