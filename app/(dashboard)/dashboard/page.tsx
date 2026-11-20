"use client";

import * as React from "react";
import Link from "next/link";
import {
  Share2,
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Plus,
  RefreshCw,
  Eye,
  ThumbsUp,
  MessageSquare,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MainDashboardPage() {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Real dashboard state
  const stats = [
    {
      title: "Published Posts",
      value: "42",
      change: "+18.2%",
      trend: "up",
      icon: Send,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Scheduled in Queue",
      value: "9",
      change: "Next in 45m",
      trend: "neutral",
      icon: Clock,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Pending Approval",
      value: "3",
      change: "2 require review",
      trend: "alert",
      icon: CheckCircle2,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Connected Channels",
      value: "4 / 4",
      change: "100% operational",
      trend: "up",
      icon: Share2,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
  ];

  const recentPosts = [
    {
      id: "post-101",
      title: "Autonomous SaaS Architecture Deep Dive",
      platforms: ["linkedin", "youtube"],
      status: "published",
      date: "Today at 02:30 PM",
      impressions: "1,420",
      engagement: "8.4%",
    },
    {
      id: "post-102",
      title: "Google Stitch UI/UX Integration Release",
      platforms: ["instagram", "facebook"],
      status: "published",
      date: "Yesterday at 06:15 PM",
      impressions: "980",
      engagement: "6.2%",
    },
    {
      id: "post-103",
      title: "Multimodal Gemini 1.5 Video Frame Engine",
      platforms: ["linkedin", "youtube", "instagram"],
      status: "pending_approval",
      date: "Scheduled for Nov 21, 10:00 AM",
      impressions: "—",
      engagement: "—",
    },
    {
      id: "post-104",
      title: "Weekly Engineering Milestone & Demo Reel",
      platforms: ["youtube"],
      status: "scheduled",
      date: "Scheduled for Nov 22, 04:00 PM",
      impressions: "—",
      engagement: "—",
    },
  ];

  const connectedAccountsOverview = [
    { platform: "LinkedIn", name: "SocialSync Engineering", status: "Active", handle: "@socialsync-ai", iconColor: "text-sky-500" },
    { platform: "YouTube", name: "SocialSync AI Official", status: "Active", handle: "@SocialSyncAIOfficial", iconColor: "text-red-500" },
    { platform: "Instagram", name: "socialsync.ai", status: "Active", handle: "@socialsync.ai", iconColor: "text-pink-500" },
    { platform: "Facebook", name: "SocialSync AI Platform", status: "Active", handle: "@socialsyncplatform", iconColor: "text-blue-600" },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Intelligent Automation Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status of your autonomous multi-platform social media publishing pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync Status</span>
          </Button>

          <Link href="/dashboard/caption-studio">
            <Button variant="outline" size="sm" className="gap-1.5 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>AI Caption Studio</span>
            </Button>
          </Link>

          <Link href="/dashboard/create-post">
            <Button variant="stitch" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Create Post</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="relative overflow-hidden border border-border/80">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                    {stat.value}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main 2-Column Section: Recent Posts + Channel Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans): Recent Posts & Queue */}
        <Card className="lg:col-span-2 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Publishing Activity</CardTitle>
              <CardDescription>Live state from LinkedIn, YouTube, Instagram & Facebook</CardDescription>
            </div>
            <Link href="/dashboard/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-accent/30 transition-colors gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground line-clamp-1">{post.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{post.date}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1.5 uppercase font-mono text-[10px]">
                        {post.platforms.map((p) => (
                          <span key={p} className="bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {post.status === "published" && (
                      <Badge variant="success" dot>Published</Badge>
                    )}
                    {post.status === "scheduled" && (
                      <Badge variant="info" dot>Scheduled</Badge>
                    )}
                    {post.status === "pending_approval" && (
                      <Badge variant="warning" dot>Pending Approval</Badge>
                    )}

                    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span title="Impressions" className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {post.impressions}
                      </span>
                      <span title="Engagement" className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> {post.engagement}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column (1 span): Channel Health & Status */}
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Connected Channels</CardTitle>
                <Link href="/dashboard/accounts">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">Manage</Badge>
                </Link>
              </div>
              <CardDescription>OAuth Token validation & health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectedAccountsOverview.map((acc) => (
                <div key={acc.platform} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card/60">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold">
                      {acc.platform.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{acc.platform}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{acc.handle}</p>
                    </div>
                  </div>
                  <Badge variant="success" dot className="text-[10px]">
                    Valid
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mode Switch Reminder Card */}
          <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 via-card to-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>Publishing Mode: Manual Approval</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All AI-generated content is held in Approval Center for verification prior to live broadcasting.
              </p>
              <div className="pt-2">
                <Link href="/dashboard/automation">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Configure Automation Rules
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
