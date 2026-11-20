"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Plus,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  User,
  Shield,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/create-post": "Create Post",
  "/dashboard/calendar": "Scheduled Posts",
  "/dashboard/accounts": "Connected Accounts",
  "/dashboard/approvals": "Approval Center",
  "/dashboard/history": "Post History",
  "/dashboard/analytics": "Analytics",
  "/dashboard/automation": "Settings & Automation",
  "/dashboard/caption-studio": "AI Caption Studio",
  "/dashboard/profile": "User Profile",
  "/dashboard/security": "Security Settings",
};

export function Header({
  onMenuToggle,
}: {
  onMenuToggle: () => void;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const currentPageTitle = PAGE_TITLES[pathname] || "Dashboard";

  const notifications = [
    {
      id: "1",
      title: "YouTube Video Published",
      desc: "System demonstration video successfully uploaded and verified",
      time: "10m ago",
      type: "success",
    },
    {
      id: "2",
      title: "Manual Approval Pending",
      desc: "Post variant for LinkedIn is awaiting editorial confirmation",
      time: "45m ago",
      type: "warning",
    },
    {
      id: "3",
      title: "Instagram Connection Verified",
      desc: "Meta Graph token validated for Professional account",
      time: "2h ago",
      type: "info",
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      {/* Left: Mobile menu toggle & Current Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            {currentPageTitle}
          </h2>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>APIs Active</span>
          </div>
        </div>
      </div>

      {/* Right: Search, Create Post, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Global Search input (hidden on small screens) */}
        <div className="relative hidden md:block w-48 lg:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Create Post quick button */}
        <Link href="/dashboard/create-post">
          <Button variant="default" size="sm" className="hidden sm:inline-flex h-8 text-xs gap-1.5 font-medium">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Post</span>
          </Button>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-card p-3 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-border pb-2 px-1">
                <span className="font-semibold text-xs text-foreground">Notifications</span>
                <span className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary">
                  Mark all as read
                </span>
              </div>
              <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2 px-1 hover:bg-accent/40 rounded transition-colors">
                    <div className="flex items-start gap-2">
                      {n.type === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">
                          {n.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Toggle light/dark mode"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center rounded-md border border-border p-1 hover:bg-accent transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
              SS
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-card p-2 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="border-b border-border px-2.5 py-1.5">
                <p className="text-xs font-semibold text-foreground">SocialSync Admin</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">admin@socialsync.ai</p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile Settings</span>
                </Link>
                <Link
                  href="/dashboard/security"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Security & Keys</span>
                </Link>
              </div>
              <div className="border-t border-border pt-1">
                <Link
                  href="/login"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
