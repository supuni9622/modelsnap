"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/app";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function SuccessPaymentPage() {
  const { refreshBillingData, billing } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleSuccessPayment = async () => {
      // Wait for webhook to process (usually takes 1-3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh billing data to show updated credits/subscription
      setIsRefreshing(true);
      try {
        await refreshBillingData();
      } catch (error) {
        console.error("Failed to refresh billing data:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    handleSuccessPayment();
  }, [refreshBillingData]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="mt-2">
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRefreshing ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
              <p className="text-sm text-muted-foreground">Updating your account...</p>
            </div>
          ) : (
            <>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Current Plan:</p>
                <p className="text-lg font-semibold">
                  {billing?.details?.name || "Loading..."}
                </p>
                {billing?.credits !== undefined && (
                  <>
                    <p className="text-sm font-medium mt-4">Credits:</p>
                    <p className="text-lg font-semibold">{billing.credits}</p>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button asChild className="w-full">
                  <Link href="/dashboard/business/billing">
                    View Plans
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard/business/generate">
                    Go to Studio
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

