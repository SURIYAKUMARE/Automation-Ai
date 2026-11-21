"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Send,
  Calendar,
  ShieldCheck,
  FileCode2,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const NAV_TABS = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: Layers,
    matches: (pathname: string) => pathname === "/dashboard",
  },
  {
    name: "Publish Now",
    href: "/dashboard/create-post",
    icon: Send,
    matches: (pathname: string) => pathname.startsWith("/dashboard/create-post"),
  },
  {
    name: "Schedules",
    href: "/dashboard/calendar",
    icon: Calendar,
    matches: (pathname: string) => pathname.startsWith("/dashboard/calendar"),
  },
  {
    name: "Authentication",
    href: "/dashboard/accounts",
    icon: ShieldCheck,
    matches: (pathname: string) => pathname.startsWith("/dashboard/accounts"),
  },
  {
    name: "Execution Logs",
    href: "/dashboard/history",
    icon: FileCode2,
    matches: (pathname: string) =>
      pathname.startsWith("/dashboard/history") ||
      pathname.startsWith("/dashboard/approvals"),
  },
];

export function TopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="w-full bg-card border-b border-border">
      {/* Top branding bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <img
            src="/icon.png"
            alt="SocialSync AI Logo"
            className="h-9 w-9 rounded-xl object-contain shadow-sm transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground flex items-center">
              SocialSync <span className="ml-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">AI</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Cross-Platform Distribution Engine
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Engine Active Indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Engine Active
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Capsule Pill Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <nav
          className="inline-flex p-1 bg-muted/60 border border-border rounded-xl gap-1 text-xs sm:text-sm font-medium w-full sm:w-auto overflow-x-auto"
          aria-label="Main Navigation"
        >
          {NAV_TABS.map((tab) => {
            const isActive = tab.matches(pathname);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-border font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
