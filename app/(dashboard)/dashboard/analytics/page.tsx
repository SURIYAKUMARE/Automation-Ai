"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Eye,
  ThumbsUp,
  Share2,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = React.useState("7d");
  const [isLoading, setIsLoading] = React.useState(true);
  const [overview, setOverview] = React.useState<any>(null);
  const [connectedCount, setConnectedCount] = React.useState(0);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        const [ovRes, accRes] = await Promise.all([
          fetch("/api/analytics/overview"),
          fetch("/api/accounts"),
        ]);

        if (ovRes.ok) {
          const ovData = await ovRes.json();
          setOverview(ovData.overview);
        }

        if (accRes.ok) {
          const accData = await accRes.json();
          const activeAccounts = (accData.accounts || []).filter((a: any) => a.status === "active");
          setConnectedCount(activeAccounts.length);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  const totalImpressions = overview?.totalImpressions || 0;
  const avgEngagement = overview?.averageEngagementRate || "0.0%";
  const totalPosts = overview?.totalPosts || 0;
  const totalReach = overview?.totalReach || 0;
  const dailyActivity = overview?.dailyActivity || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Performance & Engagement Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aggregated multi-channel metrics retrieved from official platform APIs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {connectedCount === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">No Accounts Connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your official social accounts in the Authentication tab to stream live impressions, audience reach, and real-time engagement data.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/accounts"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-xs whitespace-nowrap hover:opacity-90 transition-opacity"
          >
            <span>Connect Accounts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Total Reach / Impressions</span>
              <Eye className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                {totalImpressions.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-medium">live</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Avg Engagement Rate</span>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                {avgEngagement}
              </span>
              <span className="text-xs text-muted-foreground font-medium">rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Published Posts</span>
              <ThumbsUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                {totalPosts}
              </span>
              <span className="text-xs text-muted-foreground font-medium">posts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Audience Reach</span>
              <Share2 className="h-4 w-4 text-pink-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                {totalReach.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-medium">users</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cross-Platform Reach Trends</CardTitle>
          <CardDescription>Daily impressions per connected channel</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyActivity.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyActivity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      borderColor: "#374151",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Area type="monotone" dataKey="impressions" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-muted-foreground">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No Reach Activity Logged</p>
              <p className="mt-1">Publish content across connected platforms to begin tracking performance metrics.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
