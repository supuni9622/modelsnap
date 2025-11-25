"use client";

import { useAppContext } from "@/context/app";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SubscriptionBadge Component
 * 
 * Displays the current subscription package for business users in the header.
 * Shows plan name with appropriate styling based on tier.
 */
export default function SubscriptionBadge() {
  const { billing } = useAppContext();

  // Only show for business users with billing data
  if (!billing || !billing.plan) {
    return null;
  }

  const planId = billing.plan;
  const planName = billing.details?.name || planId;

  // Show crown icon for paid plans
  const isPaidPlan = planId !== "free";

  // Get plan-specific styling
  const getPlanStyles = () => {
    switch (planId) {
      case "free":
        return "bg-gradient-to-r from-secondary/80 to-secondary/60 text-secondary-foreground border border-secondary/40 shadow-sm";
      case "starter":
        return "bg-gradient-to-r from-[#356DFF] to-[#5B8AFF] text-white border border-[#356DFF]/30 shadow-md shadow-[#356DFF]/20";
      case "growth":
        return "bg-gradient-to-r from-[#4BE4C1] via-[#5BFFD9] to-[#4BE4C1] text-[#015064] border border-[#4BE4C1]/40 shadow-md shadow-[#4BE4C1]/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <Badge
      className={cn(
        "gap-1.5 px-3 py-1.5 font-semibold transition-all duration-300 hover:scale-105",
        getPlanStyles()
      )}
    >
      {isPaidPlan && (
        <Crown className={cn(
          "h-3.5 w-3.5 transition-transform duration-300",
          planId === "growth" && "text-[#015064]"
        )} />
      )}
      <span className="font-medium">{planName}</span>
    </Badge>
  );
}

