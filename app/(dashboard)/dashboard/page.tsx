"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Link2,
  Plus,
  Sparkles,
  BarChart3,
  Video,
  Layers,
  RotateCw,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";

type DashboardSummary = {
  published: number;
  scheduled: number;
  pending: number;
  failed: number;
  connectedAccounts: number;
  upcoming: { scheduled_for: string }[];
  recent: { id: string; title: string | null; status: string; updated_at: string }[];
};

const STAT_CONFIGS = [
  {
    key: "connectedAccounts",
    label: "Connected Channels",
    href: "accounts",
    icon: Share2,
  },
  {
    key: "published",
    label: "Published Posts",
    href: "history",
    icon: CheckCircle2,
  },
  {
    key: "scheduled",
    label: "Scheduled Queue",
    href: "calendar",
    icon: Calendar,
  },
  {
    key: "pending",
    label: "Awaiting Review",
    href: "approvals",
    icon: Clock,
  },
  {
    key: "failed",
    label: "Failed Deliveries",
    href: "history?status=failed",
    icon: AlertCircle,
  },
] as const;

export default function DashboardOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const cutoff = startOfDay(new Date()).toISOString();
    fetch("/api/dashboard/summary?from=" + encodeURIComponent(cutoff), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Dashboard unavailable");
        setSummary(await response.json());
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  const schedule = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(new Date(), index);
    return {
      dayName: format(day, "EEE"),
      dayNumber: format(day, "d"),
      dateStr: format(day, "MMM d"),
      count: summary?.upcoming.filter((post) => isSameDay(day, new Date(post.scheduled_for))).length ?? 0,
      isToday: index === 0,
    };
  });
  const maxCount = Math.max(1, ...schedule.map((day) => day.count));

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status of your connected accounts, publishing schedule, and campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/caption-studio">
            <Button variant="outline" size="sm" className="h-9 text-xs rounded-lg gap-1.5 border-border">
              <Sparkles size={13} className="text-muted-foreground" />
              <span>AI Studio</span>
            </Button>
          </Link>
          <Link href="/dashboard/create-post">
            <Button variant="stitch" size="sm" className="h-9 text-xs rounded-lg gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <Plus size={14} />
              <span>Create Post</span>
            </Button>
          </Link>
        </div>
      </div>

      {failed && (
        <div role="alert" className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>Could not load live workspace metrics.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((v) => v + 1);
            }}
            className="font-medium underline hover:text-foreground inline-flex items-center gap-1"
          >
            <RotateCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5" aria-busy={!summary && !failed}>
        {STAT_CONFIGS.map((stat) => {
          const Icon = stat.icon;
          const val = summary ? summary[stat.key] : "—";
          const isErrorStat = stat.key === "failed" && typeof val === "number" && val > 0;

          return (
            <Link
              key={stat.key}
              href={`/dashboard/${stat.href}`}
              className={cn(
                "group p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all flex flex-col justify-between space-y-2",
                isErrorStat && "border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.label}
                </span>
                <Icon
                  size={14}
                  className={cn(
                    "text-muted-foreground/70 group-hover:text-foreground transition-colors",
                    isErrorStat && "text-rose-600 dark:text-rose-400"
                  )}
                />
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    "text-2xl font-bold tracking-tight text-foreground tabular-nums",
                    isErrorStat && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {val}
                </span>
                <ArrowUpRight size={13} className="text-muted-foreground/40 group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Two Column Layout: Schedule & Recent Activity */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        
        {/* Left: 7-Day Schedule Distribution (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Upcoming Schedule</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Posts queued for the next 7 days</p>
            </div>
            <Link
              href="/dashboard/calendar"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View Calendar</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>

          {summary ? (
            <div className="pt-2">
              <div className="grid grid-cols-7 gap-2">
                {schedule.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="h-28 w-full rounded-lg bg-muted/40 p-1 flex items-end justify-center">
                      {item.count > 0 ? (
                        <div
                          className="w-full rounded-md bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center transition-all hover:bg-indigo-700"
                          style={{ height: Math.max(22, Math.round((item.count / maxCount) * 100)) }}
                          title={`${item.count} post${item.count > 1 ? "s" : ""} on ${item.dateStr}`}
                        >
                          {item.count}
                        </div>
                      ) : (
                        <div className="h-1 w-3 rounded-full bg-border mb-1" />
                      )}
                    </div>
                    <div className="text-center">
                      <span className={cn("text-[11px] font-medium block", item.isToday ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-muted-foreground")}>
                        {item.dayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 font-mono">
                        {item.dayNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
              Loading schedule...
            </div>
          )}

          {summary && !schedule.some((s) => s.count > 0) && (
            <p className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded-lg">
              No posts queued for the upcoming week. Use the composer to schedule ahead.
            </p>
          )}
        </div>

        {/* Right: Recent Publishing Activity (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest campaigns and delivery states</p>
            </div>
            <Link
              href="/dashboard/history"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>All Activity</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>

          {summary ? (
            summary.recent.length ? (
              <ul className="divide-y divide-border/60 -my-2">
                {summary.recent.map((post) => {
                  const isPublished = post.status === "published";
                  const isFailed = post.status.includes("fail");
                  const isDraft = post.status === "draft";

                  return (
                    <li key={post.id} className="py-2.5">
                      <Link
                        href={isDraft ? `/dashboard/create-post?draft=${post.id}` : `/dashboard/history?post=${post.id}`}
                        className="flex items-center justify-between gap-3 group rounded-md p-1 -m-1 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {post.title || "Untitled Post"}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {post.updated_at ? format(new Date(post.updated_at), "MMM d, h:mm a") : "Recent"}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize shrink-0 border",
                            isPublished && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                            isFailed && "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
                            isDraft && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                            !isPublished && !isFailed && !isDraft && "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {post.status.replaceAll("_", " ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recent campaigns found.
              </div>
            )
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading recent campaigns...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
