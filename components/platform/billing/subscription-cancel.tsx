"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAppContext } from "@/context/app";

export function SubscriptionCancel() {
  const { billing, refreshBillingData } = useAppContext();
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);

  // Only show if user has a paid plan
  if (
    !billing?.details ||
    billing.details.planType === "free" ||
    billing.details.name === "Free" ||
    !billing.details.price
  ) {
    return null;
  }

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelImmediately,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success(
          cancelImmediately
            ? "Subscription canceled successfully"
            : "Subscription will be canceled at the end of the billing period"
        );
        await refreshBillingData();
      } else {
        toast.error(data.message || "Failed to cancel subscription");
      }
    } catch (error) {
      toast.error("Failed to cancel subscription");
      console.error(error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="text-lg">Cancel Subscription</CardTitle>
        <CardDescription>
          Cancel your subscription. You can choose to cancel immediately or at the end of your billing period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="cancelType"
              checked={!cancelImmediately}
              onChange={() => setCancelImmediately(false)}
              className="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Cancel at end of billing period (recommended)
              </span>
            </div>
          </label>
          <p className="text-xs text-muted-foreground ml-6">
            You'll continue to have access until the end of your current billing period.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="cancelType"
              checked={cancelImmediately}
              onChange={() => setCancelImmediately(true)}
              className="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm">Cancel immediately</span>
            </div>
          </label>
          <p className="text-xs text-muted-foreground ml-6">
            Your subscription will end immediately. No refunds will be issued.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isCanceling}>
              {isCanceling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                {cancelImmediately ? (
                  <>
                    Your subscription will be canceled immediately. You will lose access to premium features right away.
                    <br />
                    <br />
                    <strong>No refunds will be issued for the current billing period.</strong>
                  </>
                ) : (
                  <>
                    Your subscription will be canceled at the end of your current billing period. You'll continue to
                    have access to all premium features until then.
                    <br />
                    <br />
                    You can reactivate your subscription anytime before the cancellation takes effect.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelImmediately ? "Cancel Immediately" : "Schedule Cancellation"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

