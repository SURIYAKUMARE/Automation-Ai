"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  CircleAlert,
  Download,
  Share2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import { SocialPlatform } from "@/types";
import { cn } from "@/lib/utils";

const metricKeys = ["views", "likes", "comments", "shares", "reach", "impressions"] as const;
type Metric = (typeof metricKeys)[number];
type Row = {
  id: string;
  title: string;
  platform: SocialPlatform;
  status: string;
  syncedAt: string | null;
  metrics: Record<Metric, number | null>;
};
type Overview = {
  totalPosts: number;
  failedPosts: number;
  queuedPosts: number;
  connectedPlatforms: number;
};
type Audience = {
  id: string;
  platform: SocialPlatform;
  name: string;
  count: number | null;
  change: number | null;
  since: string | null;
  observedOn: string | null;
  rounded: boolean;
};

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const [posts, setPosts] = useState<Row[]>([]);
  const [overview, setOverview] = useState<Overview>();
  const [rowsPending, setRowsPending] = useState(true);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<Audience[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/overview?days=" + days, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setOverview((await response.json()).overview);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load the publishing summary.");
      });
    return () => controller.abort();
  }, [days]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/posts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setPosts((await response.json()).posts);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load provider metrics.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRowsPending(false);
      });

    fetch("/api/analytics/accounts", { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setAudience((await response.json()).accounts);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const completed = overview ? (overview.totalPosts ?? 0) + (overview.failedPosts ?? 0) : 0;
  const publishedRate = overview && completed ? ((100 * overview.totalPosts) / completed).toFixed(1) + "%" : "—";

  const cards = [
    { title: "Published Posts", count: overview?.totalPosts, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { title: "Delivery Failures", count: overview?.failedPosts, icon: CircleAlert, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
    { title: "Publication Success Rate", count: publishedRate, icon: TrendingUp, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
    { title: "Queued / Scheduled", count: overview?.queuedPosts, icon: Calendar, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
    { title: "Connected Channels", count: overview?.connectedPlatforms, icon: Share2, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Publishing Analytics &amp; Performance</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Verified Metrics
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authentic delivery outcomes, channel engagement rates, and follower telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <span>Range:</span>
            <select
              value={days}
              onChange={(e) => {
                setOverview(undefined);
                setDays(e.target.value);
              }}
              className="h-8 rounded-xl border border-border bg-card px-2.5 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>

          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl border-border/80">
            <a href="/api/analytics/export" download>
              <Download size={13} />
              <span>Export CSV</span>
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
          <CircleAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className="rounded-2xl border-border/70 bg-card p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn("size-8 rounded-xl flex items-center justify-center border", c.color)}>
                  <Icon size={16} />
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Live</span>
              </div>
              <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {c.count ?? "—"}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground truncate">{c.title}</p>
            </Card>
          );
        })}
      </div>

      {/* Platform Delivery Outcomes Table */}
      <Card className="rounded-2xl border-border/70 bg-card shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recent Platform Delivery &amp; Engagement
            </CardTitle>
            <CardDescription className="text-xs text-foreground font-medium pt-0.5">
              Real telemetry received from official platform APIs.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rowsPending ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading platform metrics…</div>
          ) : !posts.length ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No platform delivery records observed in this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-4">Post &amp; Platform</th>
                    <th className="py-2.5 px-3">Status</th>
                    {metricKeys.map((key) => (
                      <th key={key} className="py-2.5 px-3 capitalize">
                        {key}
                      </th>
                    ))}
                    <th className="py-2.5 px-3">Engagement</th>
                    <th className="py-2.5 px-4 text-right">Synced At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {posts.map((row) => {
                    const isPublished = row.status === "published";
                    const isFailed = row.status.includes("fail");
                    const engagement =
                      row.metrics.impressions && row.metrics.likes !== null && row.metrics.comments !== null
                        ? (((row.metrics.likes + row.metrics.comments) * 100) / row.metrics.impressions).toFixed(1) + "%"
                        : "—";

                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2 max-w-xs truncate">
                            <PlatformIcon platform={row.platform} className="h-4 w-4 shrink-0" />
                            <span className="truncate">{row.title || "Untitled Post"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border",
                              isPublished
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : isFailed
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {row.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        {metricKeys.map((k) => (
                          <td key={k} className="py-3 px-3 tabular-nums text-foreground/80 font-mono text-[11px]">
                            {row.metrics[k]?.toLocaleString() ?? "—"}
                          </td>
                        ))}
                        <td className="py-3 px-3 tabular-nums font-semibold text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                          {engagement}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground font-mono text-[10px] whitespace-nowrap">
                          {row.syncedAt ? new Date(row.syncedAt).toLocaleDateString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Audience & Growth Cards */}
      {audience.length > 0 && (
        <Card className="rounded-2xl border-border/70 bg-card shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users size={15} className="text-indigo-500" />
              <span>Channel Audience &amp; Followers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audience.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <PlatformIcon platform={item.platform} className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">{item.platform}</span>
                </div>
                <div className="text-xl font-bold tabular-nums text-foreground">
                  {item.count?.toLocaleString() ?? "—"}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>{item.platform === "youtube" ? "Subscribers" : "Followers"}</span>
                  {item.change !== null && (
                    <span className={cn("font-medium", item.change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {item.change > 0 ? "+" : ""}
                      {item.change.toLocaleString()} growth
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
