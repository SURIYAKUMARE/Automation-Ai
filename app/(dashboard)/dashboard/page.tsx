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
      } catch (e) {
        // Fallback to active mock state
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
                {/* Platform Icon */}
                <div className="text-foreground">
                  {platform.iconType === "facebook" && (
                    <span className="font-serif font-black text-xl leading-none">f</span>
                  )}
                  {platform.iconType === "instagram" && (
                    <svg className="h-5 w-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  )}
                  {platform.iconType === "linkedin" && (
                    <span className="font-sans font-bold text-lg leading-none">in</span>
                  )}
                  {platform.iconType === "youtube" && (
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  )}
                </div>

                {/* API Tag */}
                <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-border bg-muted/50 text-muted-foreground">
                  {platform.tag}
                </span>
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
