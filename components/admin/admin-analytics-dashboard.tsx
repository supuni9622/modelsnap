"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Image as ImageIcon, CheckCircle2, XCircle, DollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  summary: {
    totalGenerations: number;
    aiGenerations: number;
    humanGenerations: number;
    successRate: number;
    totalCreditsUsed: number;
    totalRoyaltiesPaid: number;
  };
  statusBreakdown: {
    completed: number;
    failed: number;
    processing: number;
    pending: number;
  };
  typeBreakdown: {
    ai: number;
    human: number;
  };
  dailyGenerations: Array<{ date: string; count: number }>;
}

export function AdminAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/analytics/generations");
      const data = await response.json();

      if (data.status === "success") {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
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

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Generation Analytics</h2>
        <p className="text-muted-foreground mt-2">
          Overview of all image generations and platform metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalGenerations}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.statusBreakdown.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Used</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalCreditsUsed}</div>
            <p className="text-xs text-muted-foreground">AI generations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Royalties Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.summary.totalRoyaltiesPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Human model payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Generation Type</CardTitle>
            <CardDescription>Breakdown by model type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span>AI Avatar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{analytics.typeBreakdown.ai}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({analytics.summary.totalGenerations > 0
                      ? Math.round((analytics.typeBreakdown.ai / analytics.summary.totalGenerations) * 100)
                      : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Human Model</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{analytics.typeBreakdown.human}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({analytics.summary.totalGenerations > 0
                      ? Math.round((analytics.typeBreakdown.human / analytics.summary.totalGenerations) * 100)
                      : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Current generation statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Completed</span>
                </div>
                <Badge variant="default">{analytics.statusBreakdown.completed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Failed</span>
                </div>
                <Badge variant="destructive">{analytics.statusBreakdown.failed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-yellow-600" />
                  <span>Processing</span>
                </div>
                <Badge variant="secondary">{analytics.statusBreakdown.processing}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-muted-foreground" />
                  <span>Pending</span>
                </div>
                <Badge variant="outline">{analytics.statusBreakdown.pending}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Generations Chart Placeholder */}
      {analytics.dailyGenerations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Generations</CardTitle>
            <CardDescription>Generation activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.dailyGenerations.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${
                            analytics.dailyGenerations.length > 0
                              ? (day.count / Math.max(...analytics.dailyGenerations.map((d) => d.count))) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{day.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

