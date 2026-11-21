"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Calendar,
  Share2,
  CheckCircle2,
  History,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Send,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Clean 8-item navigation structure as specified in Phase 3
const navigationItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Post", href: "/dashboard/create-post", icon: PlusCircle, highlight: true },
  { name: "Scheduled Posts", href: "/dashboard/calendar", icon: Calendar },
  { name: "Connected Accounts", href: "/dashboard/accounts", icon: Share2 },
  { name: "Approval Center", href: "/dashboard/approvals", icon: CheckCircle2, badge: "2" },
  { name: "Post History", href: "/dashboard/history", icon: History },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/automation", icon: Sliders },
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
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-200 ease-in-out lg:static",
          isCollapsed ? "w-16" : "w-60",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/icon.png"
              alt="SocialFlow AI Logo"
              className="h-8 w-8 rounded-lg object-contain shrink-0 shadow-sm"
            />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  SocialFlow AI
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Publishing Engine
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen?.(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.name}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/10 px-1 text-[10px] font-mono font-semibold text-amber-500">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Engine Status Badge */}
        {!isCollapsed ? (
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-accent/30 p-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium text-foreground">Engine Active</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">v1.2.0</span>
            </div>
          </div>
        ) : (
          <div className="border-t border-border p-3 flex justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Engine Active" />
          </div>
        )}
      </aside>
    </>
  );
}
