"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/app";
import { PricingPlans } from "@/lib/config/pricing";
import { format } from "date-fns";

export default function CurrentPlanCard() {
  const { billing } = useAppContext();

  if (!billing) {
    return null;
  }

  const plan = PricingPlans.find((p) => p.id === billing.details.id) || PricingPlans[0];
  const planName = billing.details.name || plan.name;
  const planPrice = billing.details.price || plan.price;
  const currencySymbol = billing.details.currencySymbol || plan.currencySymbol || "$";
  const billingCycle = billing.details.billingCycle || plan.billingCycle || "monthly";

  // Format renewal date
  let renewalText = "";
  if (billing.renewalDate) {
    try {
      const renewalDate = new Date(billing.renewalDate);
      renewalText = format(renewalDate, "MMM d, yyyy");
    } catch (e) {
      // Invalid date, skip
    }
  }

  const handleUpgrade = () => {
    document.getElementById("upgrade-plan-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Only show upgrade button for Free and Starter plans (not Growth)
  const planId = billing.details.id || plan.id;
  const canUpgrade = planId === "free" || planId === "starter";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Current Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">{planName}</h3>
          {planPrice && (
            <p className="text-sm text-muted-foreground mt-1">
              {currencySymbol}
              {planPrice}/{billingCycle === "monthly" ? "month" : "year"}
              {renewalText && ` Your plan will renew on ${renewalText}.`}
            </p>
          )}
        </div>
        {canUpgrade && (
          <Button
            onClick={handleUpgrade}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Upgrade Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

