"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, Link } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ArrowLeft, Sparkles, ImageIcon, Palette, Video, LayoutGrid } from "lucide-react";
import { SiteSettings } from "@/lib/config/settings";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  INTENTS,
  ONBOARDING_STORAGE_KEY,
  getCategoryLabel,
  getIntentLabel,
  type CategorySlug,
  type IntentValue,
} from "@/lib/config/onboarding";

const INTENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  generate_photos: ImageIcon,
  change_background: Palette,
  image_to_video: Video,
  bulk_catalog: LayoutGrid,
};

type OnboardingView = "hero" | "business_steps" | "model_waitlist" | "model_success";
type BusinessStep = 1 | 2 | 3;

export function OnboardingFlow() {
  const router = useRouter();
  const { userId } = useAuth();
  const [view, setView] = useState<OnboardingView>("hero");
  const [businessStep, setBusinessStep] = useState<BusinessStep>(1);
  const [categories, setCategories] = useState<CategorySlug[]>([]);
  const [intents, setIntents] = useState<IntentValue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartCreating = useCallback(() => {
    if (!userId) {
      toast.error("Please sign in first");
      router.push("/sign-in");
      return;
    }
    setView("business_steps");
    setBusinessStep(1);
    setCategories([]);
    setIntents([]);
  }, [userId, router]);

  const handleBecomeModel = useCallback(() => {
    if (!userId) {
      toast.error("Please sign in first");
      router.push("/sign-in");
      return;
    }
    setView("model_waitlist");
  }, [userId, router]);

  const handleBackToHero = useCallback(() => {
    setView("hero");
    setBusinessStep(1);
    setCategories([]);
    setIntents([]);
  }, []);

  const handleBusinessBack = useCallback(() => {
    if (businessStep === 1) {
      setView("hero");
    } else {
      setBusinessStep((s) => (s - 1) as BusinessStep);
    }
  }, [businessStep]);

  const handleBusinessNext = useCallback(() => {
    if (businessStep < 3) {
      setBusinessStep((s) => (s + 1) as BusinessStep);
    }
  }, [businessStep]);

  const handleFinishBusiness = useCallback(async () => {
    if (!userId || categories.length === 0 || intents.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = { role: "business", category: categories, intent: intents };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
      }
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "BUSINESS", category: categories, intent: intents }),
      });
      const data = await response.json();
      if (data.status === "success") {
        toast.success("Welcome! You're all set.");
        const params = new URLSearchParams();
        categories.forEach((c) => params.append("category", c));
        intents.forEach((i) => params.append("intent", i));
        router.push(`/dashboard/business/generate?${params.toString()}`);
      } else {
        toast.error(data.message || "Something went wrong");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error finishing onboarding:", error);
      toast.error("Failed to complete. Please try again.");
      setIsSubmitting(false);
    }
  }, [userId, categories, intents, router]);

  const handleModelWaitlistSubmit = useCallback(async () => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MODEL" }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setView("model_success");
        setIsSubmitting(false);
        setTimeout(() => {
          router.push("/dashboard/model/profile");
        }, 2000);
      } else {
        toast.error(data.message || "Something went wrong");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error joining waitlist:", error);
      toast.error("Failed to join. Please try again.");
      setIsSubmitting(false);
    }
  }, [userId, router]);

  if (view === "hero") {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/onboarding/hero-onboarding.png"
            alt=""
            fill
            className="object-cover object-top"
            priority
            sizes="100vw"
          />
          <div
            className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/50 to-black/70"
            aria-hidden
          />
        </div>
        <Link
          href="/"
          className="absolute right-5 left-auto md:left-5 md:right-auto top-5 z-20 flex items-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
          aria-label={`${SiteSettings.name} home`}
        >
          <Image
            src={SiteSettings.logoUrlForDarkBg ?? "/static/images/light-logo.png"}
            alt={`${SiteSettings.name} Logo`}
            width={140}
            height={44}
            className="h-8 w-auto object-contain sm:h-9 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            priority
          />
        </Link>
        <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl space-y-8"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)] sm:text-5xl md:text-6xl">
              Welcome to ModelSnapper.ai
            </h1>
            <p className="text-lg text-white/90 sm:text-xl drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">
              Create professional fashion imagery with AI. Choose your path to get started.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-6">
              <Button
                size="lg"
                className="min-w-[220px] py-6 text-base font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/50 transition-shadow"
                onClick={handleStartCreating}
                aria-label="Start creating as a business"
              >
               Start creating as a business
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[220px] py-6 text-base font-semibold border-2 border-white bg-white/20 text-white shadow-lg shadow-black/30 hover:bg-white/30 hover:border-white hover:text-white hover:shadow-xl hover:shadow-black/40 transition-shadow"
                onClick={handleBecomeModel}
                aria-label="I'm a model"
              >
                I'm a model
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (view === "model_waitlist" || view === "model_success") {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
        {/* Mobile: single hero-model.png background */}
        <div className="absolute inset-0 lg:hidden" aria-hidden>
          <Image
            src="/onboarding/hero-model.png"
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority={false}
          />
        </div>
        {/* Desktop: three-column background */}
        <div className="absolute left-0 top-0 bottom-0 w-1/3 min-w-[200px] hidden lg:block" aria-hidden>
          <Image
            src="/onboarding/hero-model-2.png"
            alt=""
            fill
            className="object-contain object-left"
            sizes="33vw"
          />
        </div>
        <div className="absolute left-1/3 top-0 bottom-0 w-1/3 min-w-[200px] hidden lg:block" aria-hidden>
          <Image
            src="/onboarding/hero-model.png"
            alt=""
            fill
            className="object-contain object-center"
            sizes="33vw"
          />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 min-w-[200px] hidden lg:block" aria-hidden>
          <Image
            src="/onboarding/hero-model-3.png"
            alt=""
            fill
            className="object-contain object-right"
            sizes="33vw"
          />
        </div>
        {/* Light overlay so background images stay visible; card remains readable */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-zinc-950/50 via-zinc-950/60 to-zinc-950/50"
          aria-hidden
        />
        <Link
          href="/"
          className="absolute right-5 left-auto md:left-5 md:right-auto top-5 z-20 flex items-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
          aria-label={`${SiteSettings.name} home`}
        >
          <Image
            src={SiteSettings.logoUrlForDarkBg ?? "/static/images/light-logo.png"}
            alt={`${SiteSettings.name} Logo`}
            width={140}
            height={44}
            className="h-8 w-auto object-contain sm:h-9 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            priority={false}
          />
        </Link>
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <AnimatePresence mode="wait">
            {view === "model_waitlist" ? (
              <motion.div
                key="waitlist"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md"
              >
                <Card className="border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/50 drop-shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]">Join the early access list</CardTitle>
                    <CardDescription className="text-zinc-400 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.7)]">
                      Be among the first when our human model marketplace launches. We'll create your
                      model profile and notify you when you can complete your portfolio.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      className="w-full shadow-lg shadow-black/30"
                      size="lg"
                      onClick={handleModelWaitlistSubmit}
                      disabled={isSubmitting}
                      aria-label="Join the early access list"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Get early access"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-zinc-400 hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                      onClick={handleBackToHero}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md text-center"
              >
                <Card className="border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/50 drop-shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                      <Check className="h-8 w-8 text-green-400" />
                    </div>
                    <CardTitle className="text-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]">You're on the early access list.</CardTitle>
                    <CardDescription className="text-zinc-400 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.7)]">
                      Redirecting you to your model dashboard...
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Business 3-step flow
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/onboarding/hero-onboarding.png"
          alt=""
          fill
          className="object-cover object-top"
          sizes="100vw"
          priority={false}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/50 to-black/65"
          aria-hidden
        />
      </div>
      <Link
        href="/"
        className="absolute right-5 left-auto md:left-5 md:right-auto top-5 z-20 flex items-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
        aria-label={`${SiteSettings.name} home`}
      >
        <Image
          src={SiteSettings.logoUrlForDarkBg ?? "/static/images/light-logo.png"}
          alt={`${SiteSettings.name} Logo`}
          width={140}
          height={44}
          className="h-8 w-auto object-contain sm:h-9 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
          priority={false}
        />
      </Link>
      <div className="relative z-10 p-4 md:p-8 min-h-screen flex flex-col">
        <div className="mx-auto max-w-4xl w-full flex-1">
        <AnimatePresence mode="wait">
          {businessStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-semibold md:text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]">What do you sell?</h2>
              <p className="text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">Select all categories that describe your products.</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {CATEGORIES.map((cat) => (
                  <CategoryCard
                    key={cat.slug}
                    slug={cat.slug}
                    label={cat.label}
                    comingSoon={"available" in cat && !cat.available}
                    selected={categories.includes(cat.slug)}
                    onSelect={() => {
                      setCategories((prev) =>
                        prev.includes(cat.slug) ? prev.filter((c) => c !== cat.slug) : [...prev, cat.slug]
                      );
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button variant="outline" onClick={handleBusinessBack} aria-label="Back to start">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleBusinessNext}
                  disabled={categories.length === 0}
                  aria-label="Next step"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {businessStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-semibold md:text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]">What do you need?</h2>
              <p className="text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">Select all features you want to use.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {INTENTS.map((item, index) => (
                  <IntentCard
                    key={item.value}
                    item={item}
                    index={index}
                    selected={intents.includes(item.value)}
                    onSelect={() => {
                      setIntents((prev) =>
                        prev.includes(item.value) ? prev.filter((i) => i !== item.value) : [...prev, item.value]
                      );
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button variant="outline" onClick={handleBusinessBack} aria-label="Back to categories">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleBusinessNext}
                  disabled={intents.length === 0}
                  aria-label="Next to summary"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {businessStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-semibold md:text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]">You're ready.</h2>
              <p className="text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">
                Finish onboarding to unlock 3 free credits in Studio.
              </p>
              <div className="flex flex-wrap gap-4">
                <Card className="flex-1 min-w-[200px]">
                  <CardHeader className="pb-2">
                    <CardDescription>Categories</CardDescription>
                    <CardTitle className="text-lg">
                      {categories.length > 0 ? categories.map(getCategoryLabel).join(", ") : "—"}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="flex-1 min-w-[200px]">
                  <CardHeader className="pb-2">
                    <CardDescription>Features</CardDescription>
                    <CardTitle className="text-lg">
                      {intents.length > 0 ? intents.map(getIntentLabel).join(", ") : "—"}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button variant="outline" onClick={handleBusinessBack} aria-label="Back to intents">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleFinishBusiness}
                  disabled={isSubmitting || categories.length === 0 || intents.length === 0}
                  aria-label="Finish and continue to dashboard"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Finish & Continue"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function IntentCard({
  item,
  index,
  selected,
  onSelect,
}: {
  item: (typeof INTENTS)[number];
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = INTENT_ICONS[item.value] ?? Sparkles;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <Card
        role="button"
        tabIndex={0}
        className={cn(
          "cursor-pointer transition-all h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm",
          "shadow-md shadow-black/10 dark:shadow-black/30",
          "hover:border-primary/60 hover:shadow-lg hover:shadow-black/20 dark:hover:shadow-black/40 hover:bg-primary/5 dark:hover:bg-primary/10",
          "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
          "focus:outline-none",
          selected && "border-primary ring-2 ring-primary bg-primary/10 dark:bg-primary/20 shadow-lg shadow-black/20 dark:shadow-black/40"
        )}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        aria-pressed={selected}
        aria-label={`${item.label}: ${item.description}`}
      >
        <CardContent className="flex items-start gap-4 p-5 relative">
          {"available" in item && !item.available && (
            <span className="absolute top-3 right-12 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              Coming soon
            </span>
          )}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-16">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.label}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{item.description}</p>
          </div>
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
              selected ? "border-primary bg-primary" : "border-muted bg-background"
            )}
          >
            <AnimatePresence mode="wait">
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CategoryCard({
  slug,
  label,
  comingSoon,
  selected,
  onSelect,
}: {
  slug: string;
  label: string;
  comingSoon?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const imagePath = `/onboarding/categories/${slug}.png`;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="aspect-[4/5] overflow-hidden rounded-lg relative shadow-lg shadow-black/30"
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-end overflow-hidden rounded-lg border-2 p-3 text-left transition-all focus:outline-none focus-ring-2 focus:ring-primary focus:ring-offset-2",
          "shadow-md shadow-black/20",
          selected ? "border-primary ring-2 ring-primary shadow-lg shadow-black/40" : "border-transparent hover:border-primary/50 hover:shadow-lg hover:shadow-black/35"
        )}
        aria-label={`Select ${label}${comingSoon ? " (Coming soon)" : ""}`}
        aria-pressed={selected}
      >
        {!imgError && (
          <span className="absolute inset-0 z-0 block">
            <span className="relative block h-full w-full">
              <Image
                src={imagePath}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
                onError={() => setImgError(true)}
              />
            </span>
          </span>
        )}
        <div
          className={cn(
            "absolute inset-0 z-[1]",
            imgError ? "bg-gradient-to-t from-zinc-700 to-zinc-600" : "bg-black/50"
          )}
        />
        {comingSoon && (
          <span className="absolute top-2 left-2 z-10 text-xs font-medium text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
            Coming soon
          </span>
        )}
        <span className="relative z-10 font-medium text-white drop-shadow-md">{label}</span>
        {selected && (
          <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Check className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
        )}
      </button>
    </motion.div>
  );
}
