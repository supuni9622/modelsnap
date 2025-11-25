"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Step4PricingProps {
  pricePerAccess: number;
  currency: string;
  onPricePerAccessChange: (price: number) => void;
  onCurrencyChange: (currency: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step4Pricing({
  pricePerAccess,
  currency,
  onPricePerAccessChange,
  onCurrencyChange,
  onNext,
  onBack,
}: Step4PricingProps) {
  const platformFee = pricePerAccess * 0.1;
  const modelEarnings = pricePerAccess * 0.9;

  const canContinue = pricePerAccess >= 10 && pricePerAccess <= 500;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <span className="ml-2 text-sm text-muted-foreground">(4/5)</span>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">💰 Set Your Rate</h2>
        <p className="text-muted-foreground">
          Set a one-time access fee for brands. Once purchased, brands can generate unlimited images
          with your likeness.
        </p>
      </div>

      {/* Price Input */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">
              Your Rate (One-time) <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Select value={currency} onValueChange={onCurrencyChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="lkr">LKR</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="gbp">GBP</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="price"
                type="number"
                min={10}
                max={500}
                value={pricePerAccess}
                onChange={(e) => onPricePerAccessChange(Number(e.target.value))}
                placeholder="50"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">💡 Recommended: $30 - $100</p>
            {pricePerAccess < 10 && (
              <p className="text-xs text-destructive">Minimum price is $10</p>
            )}
            {pricePerAccess > 500 && (
              <p className="text-xs text-destructive">Maximum price is $500</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Earnings Breakdown */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">📊 Earnings Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Brand Pays:</span>
              <span className="font-semibold">
                {currency.toUpperCase()} {pricePerAccess.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee (10%):</span>
              <span className="text-destructive">
                -{currency.toUpperCase()} {platformFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">You Receive:</span>
              <span className="font-bold text-primary">
                {currency.toUpperCase()} {modelEarnings.toFixed(2)} ✨
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Paid after each purchase via Stripe Connect or manual payout.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
        <CardContent className="pt-6">
          <p className="text-sm">
            ⚠️ <strong>Important:</strong> All generated images will be watermarked to protect your
            likeness.
          </p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continue →
        </Button>
      </div>
    </div>
  );
}

