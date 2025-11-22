"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function ModelEarnings() {
  const { data, isLoading } = useQuery({
    queryKey: ["model-profile"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.status === "success" && data.data.models?.length > 0) {
        return data.data.models[0];
      }
      return null;
    },
  });

  const { data: generationsData } = useQuery({
    queryKey: ["model-generations"],
    queryFn: async () => {
      const res = await fetch("/api/model/dashboard/generations");
      const data = await res.json();
      if (data.status === "success") {
        return data.data.generations || [];
      }
      return [];
    },
  });

  const { data: payoutsData } = useQuery({
    queryKey: ["model-payouts"],
    queryFn: async () => {
      const res = await fetch("/api/model/payout/request");
      const data = await res.json();
      if (data.status === "success") {
        return data.data.payoutRequests || [];
      }
      return [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const royaltyBalance = data?.royaltyBalance || 0;
  const pendingPayouts = data?.pendingPayouts || 0;
  const availableBalance = royaltyBalance - pendingPayouts;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${royaltyBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${availableBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${pendingPayouts.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <CardDescription>Your recent generation earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {generationsData?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No earnings yet</p>
          ) : (
            <div className="space-y-2">
              {generationsData?.slice(0, 10).map((gen: any) => (
                <div
                  key={gen._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">${gen.royaltyPaid?.toFixed(2) || "0.00"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(gen.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant="outline">{gen.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Your payout requests and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {payoutsData?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payout requests yet</p>
          ) : (
            <div className="space-y-2">
              {payoutsData?.map((payout: any) => (
                <div
                  key={payout._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">${(payout.amount / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(payout.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payout.status === "completed"
                        ? "default"
                        : payout.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {payout.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

