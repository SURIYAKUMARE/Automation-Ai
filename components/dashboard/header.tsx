"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Plus,
  Radio,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  User,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";

export function Header({
  onMenuToggle,
}: {
  onMenuToggle: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const notifications = [
    {
      id: "1",
      title: "YouTube Video Published",
      desc: "Milestone Demo video published to @techcreator channel",
      time: "10m ago",
      type: "success",
    },
    {
      id: "2",
      title: "Manual Approval Required",
      desc: "Post variant for LinkedIn is waiting for review",
      time: "45m ago",
      type: "warning",
    },
    {
      id: "3",
      title: "Instagram Connection Verified",
      desc: "Business API container token refreshed successfully",
      time: "2h ago",
      type: "info",
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 sm:px-6 backdrop-blur-md">
      {/* Left side: Mobile menu toggle & Connectivity pill */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Multi-Platform APIs: Active</span>
        </div>
      </div>

      {/* Right side: Quick Action, Notifications, Theme toggle, Profile menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Post button */}
        <Link href="/dashboard/create-post">
          <Button variant="stitch" size="sm" className="hidden sm:inline-flex gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
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
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2 px-2">
                <span className="font-semibold text-sm">Notifications</span>
                <span className="text-[11px] text-muted-foreground cursor-pointer hover:text-primary">
                  Mark all as read
                </span>
              </div>
              <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2.5 px-2 hover:bg-accent/40 rounded-lg transition-colors">
                    <div className="flex items-start gap-2">
                      {n.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{n.desc}</p>
                        <span className="text-[10px] text-muted-foreground/80 mt-1 block font-mono">
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
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Toggle light/dark mode"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-400" />
          )}
        </button>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-border p-1 hover:bg-accent transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-tr from-indigo-500 to-violet-600 text-xs font-bold text-white">
              SS
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-semibold text-foreground">SocialSync Admin</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">admin@socialsync.ai</p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile Settings</span>
                </Link>
                <Link
                  href="/dashboard/security"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Security & Keys</span>
                </Link>
              </div>
              <div className="border-t border-border pt-1">
                <Link
                  href="/login"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10"
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
