"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, PanelLeftClose, PanelLeftOpen, X, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceNavigation } from "./navigation";

export function Sidebar({ close }: { close?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const ToggleIcon = close ? X : collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = close ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-[#071328] text-slate-100 border-r border-blue-900/30 transition-all duration-200 select-none",
        close ? "w-full" : collapsed ? "w-[74px]" : "w-56 xl:w-[252px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-[66px] shrink-0 items-center justify-between gap-1 border-b border-blue-900/30 px-3.5">
        <Link
          href="/dashboard"
          onClick={close}
          aria-label="SocialFlow dashboard"
          className="flex min-w-0 items-center gap-2.5 group"
        >
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 text-white shadow-md shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
            <Sparkles size={18} className="transition-transform group-hover:scale-110" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-bold tracking-tight text-white flex items-center gap-1">
                SocialFlow
                <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-blue-200 bg-clip-text text-transparent">
                  AI
                </span>
              </span>
              <span className="text-[10px] text-blue-300/70 font-medium tracking-wide">
                Google Stitch Engine
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-blue-950/80 hover:text-white transition-colors"
          aria-label={toggleLabel}
          onClick={close ?? (() => setCollapsed((value) => !value))}
        >
          <ToggleIcon size={16} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Workspace" className="min-h-0 grow space-y-5 overflow-y-auto px-3 py-4">
        {workspaceNavigation.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider uppercase text-blue-300/60">
                {group.label}
              </p>
            )}
            {group.links.map(({ label, url, icon: Icon }) => {
              const isActive = pathname === url;
              return (
                <Link
                  key={url}
                  href={url}
                  onClick={close}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-all duration-150",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-sm shadow-blue-500/35"
                      : "text-slate-300 hover:bg-blue-950/60 hover:text-white"
                  )}
                >
                  <Icon
                    size={17}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-white" : "text-blue-300/60 group-hover:text-blue-100"
                    )}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer System Status */}
      {!collapsed && (
        <div className="shrink-0 p-3 border-t border-blue-900/30">
          <div className="flex items-center justify-between rounded-lg bg-blue-950/60 border border-blue-800/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[11px] font-medium text-blue-200">Gemini 2.5 Active</span>
            </div>
            <Cpu size={13} className="text-blue-300/70" />
          </div>
        </div>
      )}
    </div>
  );
}
