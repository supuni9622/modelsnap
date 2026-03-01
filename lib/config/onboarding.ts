/**
 * Onboarding flow configuration: categories and intents
 */

export const ONBOARDING_STORAGE_KEY = "modelsnapper_onboarding";

export const CATEGORIES = [
  { slug: "tops", label: "Tops", available: true },
  { slug: "bottoms", label: "Bottoms", available: true },
  { slug: "dresses", label: "Dresses", available: true },
  { slug: "outerwear", label: "Outerwear", available: true },
  { slug: "footwear", label: "Footwear", available: false },
  { slug: "accessories", label: "Accessories", available: false },
  { slug: "activewear", label: "Activewear", available: true },
  { slug: "swimwear", label: "Swimwear", available: true },
  { slug: "intimates", label: "Intimates", available: true },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const INTENTS = [
  {
    value: "generate_photos",
    label: "Generate model photos",
    description: "Create on-model images from product photos",
    available: true,
  },
  {
    value: "change_background",
    label: "Change background",
    description: "Swap studio / lifestyle backgrounds",
    available: false,
  },
  {
    value: "image_to_video",
    label: "Image to video",
    description: "Turn product shots into short motion clips",
    available: false,
  },
  {
    value: "bulk_catalog",
    label: "Bulk catalog generation",
    description: "Generate consistent listings at scale",
    available: false,
  },
] as const;

export type IntentValue = (typeof INTENTS)[number]["value"];

export function getCategoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function getIntentLabel(value: string): string {
  return INTENTS.find((i) => i.value === value)?.label ?? value;
}
