"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  Share2,
  CalendarDays,
  CheckCircle2,
  History,
  BarChart3,
  Sliders,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Post", href: "/dashboard/create-post", icon: PlusCircle, highlight: true },
  { name: "AI Caption Studio", href: "/dashboard/caption-studio", icon: Sparkles },
  { name: "Connected Accounts", href: "/dashboard/accounts", icon: Share2 },
  { name: "Publishing Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { name: "Approval Center", href: "/dashboard/approvals", icon: CheckCircle2, badge: "2" },
  { name: "Post History", href: "/dashboard/history", icon: History },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Automation Rules", href: "/dashboard/automation", icon: Sliders },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Security Settings", href: "/dashboard/security", icon: ShieldCheck },
];

export function Sidebar({
  isMobileOpen,
  setIsMobileOpen,
}: {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out lg:static",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <Zap className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  SocialSync <span className="text-xs bg-indigo-500/20 text-indigo-400 font-semibold px-1.5 py-0.5 rounded">AI</span>
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                  Autonomous SaaS
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen?.(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  item.highlight && !isActive && "text-indigo-400 hover:text-indigo-300 bg-indigo-500/5",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    item.highlight && "text-indigo-500"
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.name}</span>
                )}
                {!isCollapsed && item.badge && (
                  <Badge variant="warning" className="ml-auto px-1.5 py-0 text-[10px] h-4">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer System Badge */}
        {!isCollapsed ? (
          <div className="border-t border-border p-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-indigo-300">Gemini 1.5 Multimodal</span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Vision & Frame Engine Online
              </p>
            </div>
          </div>
        ) : (
          <div className="border-t border-border p-3 flex justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="System Operational" />
          </div>
        )}
      </aside>
    </>
  );
}
