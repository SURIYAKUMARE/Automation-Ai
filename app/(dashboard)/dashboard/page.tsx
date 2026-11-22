"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, Clock3, Link2, Plus } from "lucide-react";

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
  { key: "connectedAccounts", label: "Connected accounts", icon: Link2, href: "accounts" },
  { key: "published", label: "Published posts", icon: CheckCircle2, href: "published" },
  { key: "scheduled", label: "Scheduled posts", icon: CalendarDays, href: "scheduled" },
  { key: "pending", label: "Awaiting approval", icon: Clock3, href: "approvals" },
  { key: "failed", label: "Failed destinations", icon: CircleAlert, href: "history" },
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

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl bg-[#142922] p-6 text-white sm:p-9">
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border-[36px] border-white/[0.05]" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Publishing overview</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/75">Manage what goes out across your social accounts and see what is coming up next.</p></div>
        <Link href="/dashboard/create-post" className="inline-flex items-center gap-2 rounded-lg bg-[#c4f4db] px-4 py-2.5 text-sm font-semibold text-[#193229] hover:bg-white"><Plus size={17} /> Create post</Link>
      </div>
    </section>

    {failed && <div role="alert" className="flex items-center gap-3 text-sm"><p>Dashboard activity is unavailable.</p>
      <button type="button" className="underline" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Retry</button></div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-busy={!summary && !failed}>
      {stats.map(({ key, label, icon: Icon, href }) => <Link key={key} href={"/dashboard/" + href + (key === "failed" ? "?status=failed" : "")}
        className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/70">
        <div className="mb-3 flex items-center justify-between text-muted-foreground"><Icon size={18} aria-hidden /><ArrowUpRight size={14} aria-hidden className="opacity-0 group-focus-visible:opacity-100 group-hover:opacity-100" /></div>
        <div className="text-2xl font-semibold tabular-nums">{summary?.[key] ?? "—"}</div><p className="text-xs text-muted-foreground">{label}</p>
      </Link>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
      <section className="min-w-0 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Next 7 days</h2><Link className="text-sm underline underline-offset-2" href="/dashboard/calendar">Open calendar</Link></div>
        {summary ? <div role="group" aria-label="Scheduled posts per day" className="mt-6 grid grid-cols-7 gap-2 text-center text-xs">
          {schedule.map((day, index) => <div key={index}><div className="flex h-24 items-end justify-center rounded bg-muted/50">
            {day.count > 0 && <div className="flex w-full items-start justify-center rounded bg-emerald-700 px-1 pt-1 text-white dark:bg-emerald-700" style={{ height: Math.max(24, Math.round(day.count / maxCount * 96)) }}>
              {day.count || null}
            </div>}
          </div><div className="mt-2 text-muted-foreground">{day.label}<span className="sr-only"> {day.count} scheduled posts</span></div></div>)}
        </div> : <p className="mt-5 text-sm text-muted-foreground">{failed ? "Schedule unavailable." : "Loading schedule…"}</p>}
        {summary && !schedule.some((day) => day.count) && <p className="mt-4 text-sm text-muted-foreground">No posts scheduled this week.</p>}
      </section>
      <section className="min-w-0 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Recent activity</h2><Link className="text-sm underline underline-offset-2" href="/dashboard/history">Open history</Link></div>
        {summary ? (summary.recent.length ? <ul className="mt-3 divide-y text-sm">{summary.recent.map((post) => <li key={post.id}>
          <Link href={post.status === "draft" ? "/dashboard/create-post?draft=" + post.id : "/dashboard/history?post=" + post.id} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:underline">
            <span className="break-words font-medium">{post.title || "Untitled post"}</span><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">{post.status.replaceAll("_", " ")}</span>
          </Link></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">No posts yet.</p>) :
          <p className="mt-4 text-sm text-muted-foreground">{failed ? "Recent activity unavailable." : "Loading activity…"}</p>}
      </section>
    </div>
  </div>;
}
