"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Link2,
  Plus,
  Sparkles,
  BarChart3,
  Video,
  Layers,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DashboardSummary = {
  published: number;
  scheduled: number;
  pending: number;
  failed: number;
  connectedAccounts: number;
  upcoming: { scheduled_for: string }[];
  recent: { id: string; title: string | null; status: string; updated_at: string }[];
};

const stats = [
  {
    key: "connectedAccounts",
    label: "Connected Accounts",
    icon: Link2,
    href: "accounts",
    badge: "Verified",
    color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    key: "published",
    label: "Published Posts",
    icon: CheckCircle2,
    href: "history",
    badge: "Live",
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "scheduled",
    label: "Scheduled Posts",
    icon: CalendarDays,
    href: "calendar",
    badge: "Queued",
    color: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  {
    key: "pending",
    label: "Drafts & Approvals",
    icon: Clock3,
    href: "approvals",
    badge: "Pending",
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    key: "failed",
    label: "Failed Destinations",
    icon: CircleAlert,
    href: "history?status=failed",
    badge: "Action Req.",
    color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
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
      label: format(day, "EEE"),
      date: format(day, "MMM d"),
      count: summary?.upcoming.filter((post) => isSameDay(day, new Date(post.scheduled_for))).length ?? 0,
    };
  });
  const maxCount = Math.max(1, ...schedule.map((day) => day.count));

  return (
    <div className="space-y-6">
      {/* SaaS Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B0F19] via-[#131B2E] to-[#0B0F19] border border-slate-800/80 p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 hidden xl:block opacity-10">
          <Layers className="h-64 w-64 text-indigo-400" />
        </div>

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles size={13} className="text-indigo-400" />
              <span>SocialSync AI • Omnichannel Cloud</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Publishing Workspace
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300/90">
              Create once and syndicate across Instagram, Facebook, LinkedIn, and YouTube with lightning-fast AI caption generation and video optimization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/create-post"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all"
            >
              <Plus size={15} />
              <span>Compose Post</span>
            </Link>
            <Link
              href="/dashboard/caption-studio"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 hover:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition-colors"
            >
              <Sparkles size={14} className="text-indigo-400" />
              <span>AI Studio</span>
            </Link>
            <Link
              href="/dashboard/calendar"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 hover:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition-colors"
            >
              <CalendarDays size={14} className="text-violet-400" />
              <span>Calendar</span>
            </Link>
          </div>
        </div>
      </section>

      {failed && (
        <div role="alert" className="flex items-center justify-between text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl">
          <div className="flex items-center gap-2.5">
            <CircleAlert size={16} />
            <span>Dashboard metrics are currently unreachable.</span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold hover:underline"
            onClick={() => {
              setFailed(false);
              setAttempt((v) => v + 1);
            }}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Real Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5" aria-busy={!summary && !failed}>
        {stats.map(({ key, label, icon: Icon, href, color, badge }) => (
          <Link
            key={key}
            href={`/dashboard/${href}`}
            className="group rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className={cn("size-8 rounded-xl flex items-center justify-center border", color)}>
                <Icon size={16} aria-hidden />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                {badge}
                <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {summary ? summary[key] : "—"}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        {/* Next 7 Days Publishing Schedule */}
        <section className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
          <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CalendarDays size={16} />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-foreground">Next 7 Days Schedule</h2>
                <p className="text-[11px] text-muted-foreground">Upcoming scheduled content distribution</p>
              </div>
            </div>
            <Link className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1" href="/dashboard/calendar">
              Open Calendar <ArrowUpRight size={13} />
            </Link>
          </div>

          {summary ? (
            <div role="group" aria-label="Scheduled posts per day" className="mt-5 grid grid-cols-7 gap-2 text-center text-xs">
              {schedule.map((day, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="flex h-28 w-full items-end justify-center rounded-xl bg-muted/40 p-1">
                    {day.count > 0 ? (
                      <div
                        className="flex w-full items-start justify-center rounded-lg bg-gradient-to-t from-indigo-600 via-indigo-500 to-violet-500 text-white font-bold text-xs pt-1 shadow-sm shadow-indigo-500/30 transition-all hover:brightness-110"
                        style={{ height: Math.max(26, Math.round((day.count / maxCount) * 100)) }}
                        title={`${day.count} posts on ${day.date}`}
                      >
                        {day.count}
                      </div>
                    ) : (
                      <div className="h-1.5 w-6 rounded-full bg-muted-foreground/20 mb-1" />
                    )}
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-foreground">
                    {day.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {day.date.split(" ")[1]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
              {failed ? "Schedule unavailable." : "Loading schedule metrics…"}
            </div>
          )}

          {summary && !schedule.some((day) => day.count) && (
            <p className="mt-4 text-xs text-muted-foreground text-center py-2.5 bg-muted/30 rounded-xl">
              No posts scheduled for the upcoming week. Use the Composer to queue upcoming releases.
            </p>
          )}
        </section>

        {/* Recent Publishing Activity */}
        <section className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Clock3 size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground">Recent Activity</h2>
                  <p className="text-[11px] text-muted-foreground">Latest campaigns &amp; delivery statuses</p>
                </div>
              </div>
              <Link className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1" href="/dashboard/history">
                View History <ArrowUpRight size={13} />
              </Link>
            </div>

            {summary ? (
              summary.recent.length ? (
                <ul className="mt-3 divide-y divide-border/40 text-xs">
                  {summary.recent.map((post) => {
                    const isDraft = post.status === "draft";
                    const isPublished = post.status === "published";
                    const isFailed = post.status.includes("fail");
                    return (
                      <li key={post.id}>
                        <Link
                          href={isDraft ? `/dashboard/create-post?draft=${post.id}` : `/dashboard/history?post=${post.id}`}
                          className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 px-2 rounded-xl transition-colors group"
                        >
                          <div className="min-w-0">
                            <span className="break-words font-medium text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block truncate">
                              {post.title || "Untitled Social Campaign"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {post.updated_at ? format(new Date(post.updated_at), "MMM d, h:mm a") : "Recent"}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize shrink-0 border",
                              isPublished && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                              isFailed && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                              isDraft && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                              !isPublished && !isFailed && !isDraft && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
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
                  No post records found. Create your first post to see activity here!
                </div>
              )
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                {failed ? "Recent activity unavailable." : "Loading recent activities…"}
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-3 mt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/scripts"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <Video size={13} className="text-indigo-500" />
              <span>Hook Scripts</span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <BarChart3 size={13} className="text-emerald-500" />
              <span>Analytics</span>
            </Link>
            <Link
              href="/dashboard/accounts"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <Link2 size={13} className="text-violet-500" />
              <span>Manage Channels</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
