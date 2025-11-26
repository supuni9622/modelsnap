"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface PayoutRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onSuccess?: () => void;
}

export function PayoutRequestDialog({
  open,
  onOpenChange,
  availableBalance,
  onSuccess,
}: PayoutRequestDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [accountDetails, setAccountDetails] = useState({
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MIN_PAYOUT = 10.0;
  const maxAmount = availableBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payoutAmount = parseFloat(amount);
    if (!payoutAmount || payoutAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (payoutAmount < MIN_PAYOUT) {
      toast.error(`Minimum payout amount is $${MIN_PAYOUT}`);
      return;
    }

    if (payoutAmount > maxAmount) {
      toast.error(`Amount exceeds available balance of $${maxAmount.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/model/payout/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: payoutAmount,
          paymentMethod,
          accountDetails,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Payout request submitted successfully");
        onOpenChange(false);
        setAmount("");
        setAccountDetails({
          bankName: "",
          accountNumber: "",
          accountHolderName: "",
          notes: "",
        });
        onSuccess?.();
      } else {
        toast.error(data.message || "Failed to submit payout request");
      }
    } catch (error) {
      console.error("Error submitting payout request:", error);
      toast.error("Failed to submit payout request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <DialogDescription>
            Request a payout from your royalty balance. Minimum payout is ${MIN_PAYOUT}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="relative mt-2">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={MIN_PAYOUT}
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available: ${availableBalance.toFixed(2)} | Min: ${MIN_PAYOUT}
            </p>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "bank_transfer" && (
            <>
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={accountDetails.bankName}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, bankName: e.target.value })
                  }
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={accountDetails.accountNumber}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                  }
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  value={accountDetails.accountHolderName}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, accountHolderName: e.target.value })
                  }
                  className="mt-2"
                  required
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={accountDetails.notes}
              onChange={(e) =>
                setAccountDetails({ ...accountDetails, notes: e.target.value })
              }
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

