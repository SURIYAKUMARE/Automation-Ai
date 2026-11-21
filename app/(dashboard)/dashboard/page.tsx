"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Zap,
  SlidersHorizontal,
  ArrowUp,
  Clock,
  KeyRound,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Video,
  Share2,
} from "lucide-react";
import { SocialPlatform } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";

interface PlatformCardState {
  id: SocialPlatform;
  name: string;
  tag: string;
  status: "Connected" | "Offline";
  connectionLabel: string;
  accountHandle?: string;
  iconType: "facebook" | "instagram" | "linkedin" | "youtube";
}

export default function DashboardOverviewPage() {
  const [platformStatuses, setPlatformStatuses] = React.useState<PlatformCardState[]>([
    {
      id: "facebook",
      name: "Facebook",
      tag: "Meta Graph",
      status: "Offline",
      connectionLabel: "Facebook Connection",
      iconType: "facebook",
    },
    {
      id: "instagram",
      name: "Instagram",
      tag: "IG Business",
      status: "Offline",
      connectionLabel: "Instagram Connection",
      iconType: "instagram",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      tag: "UGC REST",
      status: "Offline",
      connectionLabel: "LinkedIn Connection",
      iconType: "linkedin",
    },
    {
      id: "youtube",
      name: "YouTube",
      tag: "Data API v3",
      status: "Offline",
      connectionLabel: "YouTube Connection",
      iconType: "youtube",
    },
  ]);

  const [isLoading, setIsLoading] = React.useState(false);

  const [summary, setSummary] = React.useState<{
    uploads: number; published: number; scheduled: number; failed: number; connectedPlatforms: number;
    recent: { id: string; title: string | null; status: string; updated_at: string }[];
  }>();
  const [summaryError, setSummaryError] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dashboard/summary", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      setSummary(await response.json());
    }).catch(() => { if (!controller.signal.aborted) setSummaryError(true); });
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          const accounts = data.accounts || [];
          if (accounts.length > 0) {
            setPlatformStatuses((prev) =>
              prev.map((item) => {
                const found = accounts.find((a: any) => a.platform === item.id);
                if (found) {
                  return {
                    ...item,
                    status: found.status === "active" ? "Connected" : "Offline",
                    accountHandle: found.account_name || found.account_id,
                  };
                }
                return item;
              })
            );
          }
        }
      } catch {
        // Account availability can still be checked from the Accounts page.
      }
    }
    loadAccounts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Banner: Cross-Platform Publishing Control */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Cross-Platform Publishing Control
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Automate, schedule, and distribute content across Facebook, Instagram, LinkedIn, and YouTube.
          </p>
        </div>
        <Link
          href="/dashboard/create-post"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>+ New Post</span>
        </Link>
      </div>

      {summaryError && <p role="alert" className="text-sm text-destructive">Dashboard activity is unavailable.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Uploads", summary?.uploads], ["Published posts", summary?.published], ["Scheduled posts", summary?.scheduled],
          ["Failed destinations", summary?.failed], ["Connected platforms", summary?.connectedPlatforms],
        ].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{value ?? "—"}</div>
        </div>)}
      </div>
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Recent publishing activity</h2>
          <Link className="text-sm underline" href="/dashboard/history">Open history</Link></div>
        {summary && (summary.recent.length ? <ul className="mt-2 divide-y text-sm">
          {summary.recent.map((post) => <li key={post.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span>{post.title || "Untitled post"}</span>
            <span className="capitalize text-muted-foreground">{post.status.replaceAll("_", " ")} · {new Date(post.updated_at).toLocaleString()}</span>
          </li>)}
        </ul> : <p className="mt-2 text-sm text-muted-foreground">No publishing activity yet.</p>)}
      </section>
      {/* 4 Platform Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platformStatuses.map((platform) => {
          const isConnected = platform.status === "Connected";
          return (
            <Link
              key={platform.id}
              href="/dashboard/accounts"
              className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-all flex flex-col justify-between space-y-4 group shadow-sm"
            >
              <div className="flex items-center justify-between">
                {/* Platform Icon & Name */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/60 p-1.5 border border-border/50 group-hover:scale-105 transition-transform shadow-sm">
                    <PlatformIcon platform={platform.id} className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground block">{platform.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{platform.tag}</span>
                  </div>
                </div>

                {isConnected ? (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" title="Active & Connected" />
                ) : (
                  <span className="flex h-2 w-2 rounded-full bg-muted-foreground/40" title="Offline" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {platform.status}
                  </span>
                  {isConnected && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platform.connectionLabel}
                </p>
                {platform.accountHandle && (
                  <p className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                    {platform.accountHandle}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* 2-Column Section: Quick Workflows & System Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Quick Workflows */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Zap className="h-4 w-4 text-foreground" />
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Quick Workflows
            </h2>
          </div>

          <div className="space-y-3">
            {/* Workflow 1 */}
            <Link
              href="/dashboard/create-post"
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0 group-hover:scale-105 transition-transform">
                  <ArrowUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Immediate Media Broadcast
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload assets and push instantly to selected channels
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>

            {/* Workflow 2 */}
            <Link
              href="/dashboard/calendar"
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Configure Automation Engine
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Adjust cron timing and sequential content delivery rules
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>

            {/* Workflow 3 */}
            <Link
              href="/dashboard/accounts"
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0 group-hover:scale-105 transition-transform">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    OAuth Key Store
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manage verified credentials and secure access tokens
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* Right Column: System Configuration */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <SlidersHorizontal className="h-4 w-4 text-foreground" />
            <h2 className="text-base font-bold text-foreground tracking-tight">
              System Configuration
            </h2>
          </div>

          <div className="space-y-4 pt-1 font-mono text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-sans text-xs">Deployment</span>
              <span className="text-foreground font-semibold">Vercel Serverless Ready</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-sans text-xs">Content Directory</span>
              <span className="text-foreground font-semibold">./content</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-sans text-xs">Config Directory</span>
              <span className="text-foreground font-semibold">./config</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-sans text-xs">OAuth Standards</span>
              <span className="text-foreground font-semibold">OAuth 2.0 + PKCE</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-sans text-xs">AI Engine</span>
              <span className="text-foreground font-semibold">Google Gemini 1.5 Multimodal</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground font-sans text-xs">Publishing Protocol</span>
              <span className="text-foreground font-semibold">Official Platform REST APIs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
