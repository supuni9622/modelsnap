"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/app";
import { getCreditsForPlan } from "@/lib/client-utils";

export default function MonthlyCreditsCard() {
  const { billing } = useAppContext();

  if (!billing) {
    return null;
  }

  const creditsRemaining = billing.credits || 0;
  const totalCredits = billing.totalCredits || getCreditsForPlan(billing.details.id || "free");
  const creditsUsed = Math.max(0, totalCredits - creditsRemaining);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Monthly Credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={creditsUsed} max={totalCredits} className="h-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Credits Used</span>
          <span className="font-semibold">
            <span className="text-foreground">{creditsUsed.toLocaleString()}</span>
            <span className="text-muted-foreground"> / {totalCredits.toLocaleString()}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

