"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, Clock3, Link2, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { key: "connectedAccounts", label: "Connected accounts", icon: Link2, href: "accounts", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  { key: "published", label: "Published posts", icon: CheckCircle2, href: "published", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  { key: "scheduled", label: "Scheduled posts", icon: CalendarDays, href: "scheduled", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
  { key: "pending", label: "Awaiting approval", icon: Clock3, href: "approvals", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  { key: "failed", label: "Failed destinations", icon: CircleAlert, href: "history", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
] as const;

export default function DashboardOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const cutoff = startOfDay(new Date()).toISOString();
    fetch("/api/dashboard/summary?from=" + encodeURIComponent(cutoff), { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Dashboard unavailable");
      setSummary(await response.json());
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);

  const schedule = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(new Date(), index);
    return { label: format(day, "EEE"), count: summary?.upcoming.filter((post) => isSameDay(day, new Date(post.scheduled_for))).length ?? 0 };
  });
  const maxCount = Math.max(1, ...schedule.map((day) => day.count));

  return (
    <div className="space-y-6">
      {/* Google Blue Dashboard Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061533] via-[#0b2454] to-[#040e24] border border-blue-500/30 p-6 text-white sm:p-9 shadow-xl shadow-blue-950/30">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border-[36px] border-white/[0.04]" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300 mb-3">
              <Sparkles size={13} className="text-blue-400" />
              <span>Google Blue • Multimodal AI Automation</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              Publishing Overview
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100/80">
              Intelligent cross-platform distribution engine. Create, automate, and publish directly to LinkedIn, YouTube, Instagram, and Facebook.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/create-post"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all"
            >
              <Plus size={17} /> Create Post
            </Link>
            <Link
              href="/dashboard/caption-studio"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 hover:bg-blue-500/15 px-4 py-2.5 text-sm font-medium text-blue-100 transition-colors"
            >
              <Sparkles size={15} /> AI Studio
            </Link>
          </div>
        </div>
      </section>

      {failed && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
          <CircleAlert size={16} />
          <p>Dashboard activity is unavailable.</p>
          <button type="button" className="underline font-semibold" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards with Stitch Palette */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-busy={!summary && !failed}>
        {stats.map(({ key, label, icon: Icon, href, color }) => (
          <Link
            key={key}
            href={"/dashboard/" + href + (key === "failed" ? "?status=failed" : "")}
            className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className={cn("size-8 rounded-lg flex items-center justify-center", color)}>
                <Icon size={17} aria-hidden />
              </span>
              <ArrowUpRight size={15} aria-hidden className="text-muted-foreground opacity-0 group-focus-visible:opacity-100 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{summary?.[key] ?? "—"}</div>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        {/* Next 7 Days Calendar */}
        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays size={18} className="text-primary" />
              <span>Next 7 Days Schedule</span>
            </h2>
            <Link className="text-xs font-semibold text-primary hover:underline" href="/dashboard/calendar">
              Open Calendar →
            </Link>
          </div>
          {summary ? (
            <div role="group" aria-label="Scheduled posts per day" className="mt-6 grid grid-cols-7 gap-2 text-center text-xs">
              {schedule.map((day, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="flex h-24 w-full items-end justify-center rounded-lg bg-muted/40 p-1">
                    {day.count > 0 && (
                      <div
                        className="flex w-full items-start justify-center rounded-md bg-gradient-to-t from-blue-700 via-blue-600 to-sky-400 text-white font-bold text-xs pt-1 shadow-sm shadow-blue-500/30 transition-all"
                        style={{ height: Math.max(24, Math.round((day.count / maxCount) * 88)) }}
                      >
                        {day.count}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-medium text-muted-foreground">
                    {day.label}
                    <span className="sr-only"> {day.count} scheduled posts</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">{failed ? "Schedule unavailable." : "Loading schedule…"}</p>
          )}
          {summary && !schedule.some((day) => day.count) && (
            <p className="mt-4 text-xs text-muted-foreground text-center py-2 bg-muted/20 rounded-lg">
              No posts scheduled for the upcoming week.
            </p>
          )}
        </section>

        {/* Recent Activity */}
        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock3 size={18} className="text-indigo-500" />
              <span>Recent Activity</span>
            </h2>
            <Link className="text-xs font-semibold text-primary hover:underline" href="/dashboard/history">
              Open History →
            </Link>
          </div>
          {summary ? (
            summary.recent.length ? (
              <ul className="mt-3 divide-y divide-border/60 text-sm">
                {summary.recent.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={post.status === "draft" ? "/dashboard/create-post?draft=" + post.id : "/dashboard/history?post=" + post.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                    >
                      <span className="break-words font-medium text-foreground">{post.title || "Untitled post"}</span>
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-primary">
                        {post.status.replaceAll("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No posts yet.</p>
            )
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{failed ? "Recent activity unavailable." : "Loading activity…"}</p>
          )}
        </section>
      </div>
    </div>
  );
}
