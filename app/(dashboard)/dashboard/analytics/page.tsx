"use client";

import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  Calendar,
  Download,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const performanceData = [
  { name: "Mon", linkedin: 450, instagram: 680, youtube: 1200, facebook: 340 },
  { name: "Tue", linkedin: 580, instagram: 790, youtube: 1350, facebook: 410 },
  { name: "Wed", linkedin: 720, instagram: 890, youtube: 1600, facebook: 520 },
  { name: "Thu", linkedin: 690, instagram: 810, youtube: 1480, facebook: 480 },
  { name: "Fri", linkedin: 850, instagram: 1100, youtube: 2100, facebook: 630 },
  { name: "Sat", linkedin: 610, instagram: 1340, youtube: 2400, facebook: 710 },
  { name: "Sun", linkedin: 530, instagram: 1250, youtube: 2200, facebook: 680 },
];

const platformTotals = [
  { platform: "YouTube", impressions: "11,330", engagement: "9.2%", posts: 4, growth: "+24.5%" },
  { platform: "Instagram", impressions: "6,860", engagement: "7.1%", posts: 12, growth: "+16.8%" },
  { platform: "LinkedIn", impressions: "4,430", engagement: "5.8%", posts: 10, growth: "+12.1%" },
  { platform: "Facebook", impressions: "3,770", engagement: "4.2%", posts: 8, growth: "+8.4%" },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = React.useState("7d");

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
                26,390
              </span>
              <span className="text-xs text-emerald-400 font-medium">+18.4%</span>
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
                6.8%
              </span>
              <span className="text-xs text-emerald-400 font-medium">+1.2%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Total Interactions</span>
              <ThumbsUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                1,842
              </span>
              <span className="text-xs text-emerald-400 font-medium">+14.7%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Audience Growth</span>
              <Share2 className="h-4 w-4 text-pink-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                +420
              </span>
              <span className="text-xs text-emerald-400 font-medium">followers</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Area Chart */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cross-Platform Reach Trends</CardTitle>
          <CardDescription>Daily impressions per connected channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ytGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="instaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="liGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Area type="monotone" dataKey="youtube" stroke="#ef4444" fillOpacity={1} fill="url(#ytGrad)" />
                <Area type="monotone" dataKey="instagram" stroke="#ec4899" fillOpacity={1} fill="url(#instaGrad)" />
                <Area type="monotone" dataKey="linkedin" stroke="#0ea5e9" fillOpacity={1} fill="url(#liGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Platform Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platformTotals.map((item) => (
          <Card key={item.platform} className="border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{item.platform}</CardTitle>
                <Badge variant="success" className="text-[10px]">
                  {item.growth}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impressions:</span>
                <span className="font-mono font-medium text-foreground">{item.impressions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engagement:</span>
                <span className="font-mono font-medium text-foreground">{item.engagement}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Posts:</span>
                <span className="font-mono font-medium text-foreground">{item.posts}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
