"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, PanelLeftClose, PanelLeftOpen, X, Cpu, Zap } from "lucide-react";
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
        "flex h-full flex-col bg-[#0B0F19] text-slate-100 border-r border-slate-800/60 transition-all duration-200 select-none z-30",
        close ? "w-full" : collapsed ? "w-[72px]" : "w-56 xl:w-[250px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between gap-1 border-b border-slate-800/60 px-3.5">
        <Link
          href="/dashboard"
          onClick={close}
          aria-label="SocialSync AI dashboard"
          className="flex min-w-0 items-center gap-2.5 group"
        >
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all">
            <Sparkles size={17} className="transition-transform group-hover:rotate-12" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-bold tracking-tight text-white flex items-center gap-1">
                SocialSync
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">
                  AI
                </span>
              </span>
              <span className="text-[10px] text-indigo-300/70 font-medium tracking-wide">
                Omnichannel SaaS
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors"
          aria-label={toggleLabel}
          onClick={close ?? (() => setCollapsed((value) => !value))}
        >
          <ToggleIcon size={16} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Workspace" className="min-h-0 grow space-y-4 overflow-y-auto px-3 py-3.5 custom-scrollbar">
        {workspaceNavigation.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400/70">
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
                    "flex h-9 items-center gap-3 rounded-xl px-2.5 text-xs transition-all duration-150 font-medium",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-sm shadow-indigo-500/35"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
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
        <div className="shrink-0 p-3 border-t border-slate-800/60">
          <div className="flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800/80 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-300">Fast AI Engine</span>
            </div>
            <Zap size={13} className="text-indigo-400" />
          </div>
        </div>
      )}
    </div>
  );
}
