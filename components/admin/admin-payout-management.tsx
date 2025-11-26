"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PayoutRequest {
  _id: string;
  transactionReference: string;
  modelId: string | { name: string };
  modelName?: string;
  userId: {
    firstName?: string;
    lastName?: string;
    emailAddress?: string[];
  };
  amount: number;
  currency: string;
  paymentMethod: string;
  accountDetails: any;
  status: string;
  requestedAt: string;
  statusHistory?: any[];
  notes?: string;
}

export function AdminPayoutManagement() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/payouts");
      const data = await response.json();

      if (data.status === "success") {
        setPayouts(data.data.payouts || []);
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
      toast.error("Failed to fetch payout requests");
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutAction = async (
    payoutId: string,
    action: "approve" | "reject" | "complete"
  ) => {
    setProcessingId(payoutId);

    try {
      const response = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payoutId,
          action,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success(`Payout request ${action}d successfully`);
        fetchPayouts();
      } else {
        toast.error(data.message || "Failed to process payout");
      }
    } catch (error) {
      console.error("Error processing payout:", error);
      toast.error("Failed to process payout");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payout Management</h1>
        <p className="text-muted-foreground mt-2">
          Review and process model payout requests
        </p>
      </div>

      {payouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-muted-foreground">No pending payout requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <Card key={payout._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {typeof payout.modelId === "object" ? payout.modelId.name : payout.modelName}
                    </CardTitle>
                    <CardDescription>
                      {payout.userId.firstName} {payout.userId.lastName} (
                      {payout.userId.emailAddress?.[0]})
                    </CardDescription>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ref: {payout.transactionReference}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {payout.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {payout.currency === "USD" ? "$" : ""}
                      {payout.amount.toFixed(2)} {payout.currency.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Payment Method</p>
                    <p className="text-sm">{payout.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Requested At</p>
                    <p className="text-sm">
                      {format(new Date(payout.requestedAt), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                  {payout.accountDetails && (
                    <div>
                      <p className="text-sm font-medium mb-1">Account Details</p>
                      <div className="text-sm space-y-1">
                        {payout.accountDetails.bankName && (
                          <p>Bank: {payout.accountDetails.bankName}</p>
                        )}
                        {payout.accountDetails.accountNumber && (
                          <p>Account: {payout.accountDetails.accountNumber}</p>
                        )}
                        {payout.accountDetails.accountHolderName && (
                          <p>Holder: {payout.accountDetails.accountHolderName}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handlePayoutAction(payout._id, "approve")}
                    disabled={processingId === payout._id}
                  >
                    {processingId === payout._id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handlePayoutAction(payout._id, "reject")}
                    disabled={processingId === payout._id}
                  >
                    {processingId === payout._id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

