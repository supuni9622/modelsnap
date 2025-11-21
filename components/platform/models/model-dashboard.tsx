"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, TrendingUp, Image as ImageIcon, Clock, CheckCircle2, Wallet, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PayoutRequestDialog } from "@/components/platform/models/payout-request-dialog";

interface ModelStats {
  totalEarnings: number;
  totalGenerations: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
}

interface Generation {
  _id: string;
  status: string;
  outputS3Url?: string;
  generatedAt: string;
  royaltyPaid: number;
  userId: {
    firstName?: string;
    lastName?: string;
  };
}

export function ModelDashboard() {
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, generationsResponse] = await Promise.all([
        fetch("/api/model/dashboard/stats"),
        fetch("/api/model/dashboard/generations"),
      ]);

      const statsData = await statsResponse.json();
      const generationsData = await generationsResponse.json();

      if (statsData.status === "success") {
        setStats(statsData.data);
      }

      if (generationsData.status === "success") {
        setGenerations(generationsData.data.generations || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your earnings and generation history
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/model/edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
      </div>

      {/* Payout Request Button */}
      {stats && stats.pendingEarnings > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Request Payout
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You have ${stats.pendingEarnings.toFixed(2)} available for payout
                </p>
              </div>
              <Button onClick={() => setPayoutDialogOpen(true)}>
                <Wallet className="h-4 w-4 mr-2" />
                Request Payout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.thisMonthEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGenerations}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.pendingEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Awaiting payout</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="generations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generations">Generation History</TabsTrigger>
          <TabsTrigger value="consent">Consent Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="generations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Generations</CardTitle>
              <CardDescription>
                Images generated using your model profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generations.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No generations yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Businesses will generate images using your model profile
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generations.map((gen) => (
                    <div
                      key={gen._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {gen.outputS3Url && (
                          <img
                            src={gen.outputS3Url}
                            alt="Generated"
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">
                            {gen.userId?.firstName} {gen.userId?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(gen.generatedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant={
                            gen.status === "completed"
                              ? "default"
                              : gen.status === "processing"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {gen.status === "completed" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {gen.status}
                        </Badge>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +${gen.royaltyPaid.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Royalty</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent">
          <Card>
            <CardHeader>
              <CardTitle>Consent Requests</CardTitle>
              <CardDescription>
                Manage consent requests from businesses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/model/consent">
                  View All Consent Requests
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Request Dialog */}
      {stats && (
        <PayoutRequestDialog
          open={payoutDialogOpen}
          onOpenChange={setPayoutDialogOpen}
          availableBalance={stats.pendingEarnings}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
}

