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
  Upload,
  Play,
  ArrowRight,
  ShieldCheck,
  Check,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform } from "@/types";

interface ActivityPost {
  id: string;
  title: string;
  platforms: SocialPlatform[];
  status: "published" | "scheduled" | "pending_approval" | "failed";
  date: string;
  externalUrl?: string;
}

export default function MainDashboardPage() {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // 4 Summary Metrics as required in Phase 4
  const summaryMetrics = [
    {
      title: "Total Published",
      value: "42",
      subtext: "Live across channels",
      icon: Send,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Scheduled Posts",
      value: "9",
      subtext: "Next scheduled in 45m",
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
    {
      title: "Pending Approval",
      value: "3",
      subtext: "Requires human review",
      icon: CheckCircle2,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Failed Posts",
      value: "1",
      subtext: "Action required",
      icon: AlertTriangle,
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
  ];

  // 4 Connected Platforms as required in Phase 4
  const platforms = [
    {
      platform: "linkedin" as SocialPlatform,
      name: "LinkedIn",
      account: "Jeffrey Rathinam",
      handle: "@jeffreyrathinam",
      status: "Connected",
      badgeVariant: "success" as const,
      apiLabel: "UGC & Member REST API",
    },
    {
      platform: "youtube" as SocialPlatform,
      name: "YouTube",
      account: "SocialSync AI Official",
      handle: "@SocialSyncAIOfficial",
      status: "Connected",
      badgeVariant: "success" as const,
      apiLabel: "YouTube Data API v3",
    },
    {
      platform: "instagram" as SocialPlatform,
      name: "Instagram",
      account: "socialsync.ai",
      handle: "@socialsync.ai (Professional)",
      status: "Connected",
      badgeVariant: "success" as const,
      apiLabel: "Content Publishing Graph API",
    },
    {
      platform: "facebook" as SocialPlatform,
      name: "Facebook",
      account: "SocialSync Platform",
      handle: "@socialsyncplatform (Page)",
      status: "Connected",
      badgeVariant: "success" as const,
      apiLabel: "Page Feed & Media API",
    },
  ];

  // Quick Actions
  const quickActions = [
    { title: "Upload Content", desc: "Attach visual media or video reels", href: "/dashboard/create-post", icon: Upload },
    { title: "Generate AI Caption", desc: "Multimodal visual OCR & tone synthesis", href: "/dashboard/caption-studio", icon: Sparkles },
    { title: "Publish Now", desc: "Direct multi-network immediate dispatch", href: "/dashboard/create-post", icon: Play },
    { title: "Schedule Post", desc: "Calendar date & queue configuration", href: "/dashboard/calendar", icon: Calendar },
  ];

  // Recent Activity Feed
  const [recentActivity, setRecentActivity] = React.useState<ActivityPost[]>([
    {
      id: "post-101",
      title: "Autonomous Multi-Platform Distribution Architecture",
      platforms: ["linkedin", "youtube"],
      status: "published",
      date: "Today, 02:30 PM",
      externalUrl: "https://www.linkedin.com/feed/update/urn:li:ugcPost:72635489102948271/",
    },
    {
      id: "post-102",
      title: "Google Stitch Design System & Enterprise Specifications",
      platforms: ["instagram", "facebook"],
      status: "published",
      date: "Yesterday, 06:15 PM",
      externalUrl: "https://www.instagram.com/p/C_abc1234/",
    },
    {
      id: "post-103",
      title: "Multimodal Gemini 1.5 Video Frame Engine",
      platforms: ["linkedin", "youtube", "instagram"],
      status: "pending_approval",
      date: "Nov 21, 10:00 AM UTC",
    },
    {
      id: "post-104",
      title: "Engineering Milestone & System Demonstration",
      platforms: ["youtube"],
      status: "scheduled",
      date: "Nov 22, 04:00 PM UTC",
    },
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.info("Synchronizing platform health and queue statuses...");
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Platform connections and publishing queues synchronized.");
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner as specified in Phase 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back!
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, schedule and publish your content from one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync Engine</span>
          </Button>

          <Link href="/dashboard/create-post">
            <Button variant="default" size="sm" className="h-8 text-xs gap-1.5 font-medium shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Post</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryMetrics.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded border ${stat.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {stat.subtext}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connected Platforms (4 Cards Grid) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Platforms
            </h2>
          </div>
          <Link href="/dashboard/accounts" className="text-xs text-primary hover:underline font-medium">
            Manage Accounts →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((p) => (
            <Card key={p.platform} className="border-border/80 flex flex-col justify-between">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-accent/40 font-mono text-xs font-bold uppercase text-foreground">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.apiLabel}</p>
                    </div>
                  </div>
                  <Badge variant={p.badgeVariant} dot className="text-[10px]">
                    {p.status}
                  </Badge>
                </div>

                <div className="rounded bg-accent/20 p-2 text-xs border border-border/40">
                  <p className="font-medium text-foreground truncate">{p.account}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{p.handle}</p>
                </div>

                <Link href="/dashboard/accounts" className="block pt-1">
                  <Button variant="outline" size="sm" className="w-full h-7 text-[11px]">
                    Configure
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Quick Workflows
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link key={i} href={action.href} className="group">
                <Card className="border-border/80 hover:border-slate-600 transition-colors h-full">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{action.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-normal">{action.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Section */}
      <Card className="border-border/80">
        <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs text-foreground font-medium pt-0.5">
              Live multi-platform publishing operations and queue records
            </CardDescription>
          </div>
          <Link href="/dashboard/history" className="text-xs text-primary hover:underline font-medium">
            Full Audit History →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">No recent publishing activity</p>
              <p className="text-[11px] text-muted-foreground">
                Create your first campaign to initiate automated or reviewed broadcasts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentActivity.map((post) => (
                <div key={post.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-accent/20 transition-colors gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{post.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>{post.date}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1 uppercase">
                        {post.platforms.map((p) => (
                          <span key={p} className="bg-accent/60 text-muted-foreground px-1.5 py-0.2 rounded text-[9px] border border-border/60">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {post.status === "published" && (
                      <Badge variant="success" dot className="text-[10px]">
                        Published
                      </Badge>
                    )}
                    {post.status === "scheduled" && (
                      <Badge variant="info" dot className="text-[10px]">
                        Scheduled
                      </Badge>
                    )}
                    {post.status === "pending_approval" && (
                      <Badge variant="warning" dot className="text-[10px]">
                        Pending Approval
                      </Badge>
                    )}
                    {post.status === "failed" && (
                      <Badge variant="error" dot className="text-[10px]">
                        Failed
                      </Badge>
                    )}

                    {post.externalUrl && (
                      <a
                        href={post.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground text-xs"
                        title="View live post"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
