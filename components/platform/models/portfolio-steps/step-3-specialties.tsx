"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Step3SpecialtiesProps {
  clothingCategories: string[];
  modelingStyles: string[];
  onClothingCategoriesChange: (categories: string[]) => void;
  onModelingStylesChange: (styles: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CLOTHING_CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "activewear",
  "outerwear",
  "swimwear",
  "one-pieces",
  "accessories",
] as const;

const MODELING_STYLES = [
  "lifestyle",
  "e-commerce",
  "editorial",
  "fitness",
  "formal",
  "casual",
] as const;

export function Step3Specialties({
  clothingCategories,
  modelingStyles,
  onClothingCategoriesChange,
  onModelingStylesChange,
  onNext,
  onBack,
}: Step3SpecialtiesProps) {
  const toggleCategory = (category: string) => {
    if (clothingCategories.includes(category)) {
      onClothingCategoriesChange(clothingCategories.filter((c) => c !== category));
    } else {
      onClothingCategoriesChange([...clothingCategories, category]);
    }
  };

  const toggleStyle = (style: string) => {
    if (modelingStyles.includes(style)) {
      onModelingStylesChange(modelingStyles.filter((s) => s !== style));
    } else {
      onModelingStylesChange([...modelingStyles, style]);
    }
  };

  const canContinue = clothingCategories.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <div className="w-3 h-3 rounded-full bg-muted" />
        <span className="ml-2 text-sm text-muted-foreground">(3/5)</span>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">👗 What do you specialize in?</h2>
        <p className="text-muted-foreground">
          Select the types of fashion products you're comfortable modeling.
        </p>
      </div>

      {/* Clothing Categories */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Clothing Categories:</Label>
          <div className="grid grid-cols-2 gap-4">
            {CLOTHING_CATEGORIES.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={clothingCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                <Label
                  htmlFor={`category-${category}`}
                  className="text-sm font-normal cursor-pointer capitalize"
                >
                  {category}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modeling Styles */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Modeling Style:</Label>
          <div className="grid grid-cols-2 gap-4">
            {MODELING_STYLES.map((style) => (
              <div key={style} className="flex items-center space-x-2">
                <Checkbox
                  id={`style-${style}`}
                  checked={modelingStyles.includes(style)}
                  onCheckedChange={() => toggleStyle(style)}
                />
                <Label
                  htmlFor={`style-${style}`}
                  className="text-sm font-normal cursor-pointer capitalize"
                >
                  {style}
                </Label>
              </div>
            ))}
          </div>
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

