"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Plus,
  Command,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceNavigation } from "./navigation";

export function Sidebar({ close }: { close?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const ToggleIcon = close ? X : collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = close ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-card dark:bg-[#090D16] text-foreground border-r border-border transition-all duration-200 select-none z-30",
        close ? "w-full" : collapsed ? "w-[68px]" : "w-60 xl:w-[248px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3.5">
        <Link
          href="/dashboard"
          onClick={close}
          className="flex min-w-0 items-center gap-2.5 group"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Layers size={15} className="transition-transform group-hover:scale-105" />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                SocialSync
              </span>
              <span className="text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.2 rounded">
                AI
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={toggleLabel}
          onClick={close ?? (() => setCollapsed((v) => !v))}
        >
          <ToggleIcon size={15} />
        </button>
      </div>

      {/* Quick Action: New Post */}
      {!collapsed ? (
        <div className="p-3 pb-1">
          <Link
            href="/dashboard/create-post"
            onClick={close}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>New Post</span>
          </Link>
        </div>
      ) : (
        <div className="p-2.5 pb-1 flex justify-center">
          <Link
            href="/dashboard/create-post"
            onClick={close}
            title="New Post"
            className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Plus size={15} />
          </Link>
        </div>
      )}

      {/* Navigation Sections */}
      <nav aria-label="Workspace" className="min-h-0 grow space-y-4 overflow-y-auto px-2.5 py-2.5 custom-scrollbar">
        {workspaceNavigation.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-medium tracking-tight text-muted-foreground/70 uppercase">
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
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-xs transition-colors font-medium relative",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-indigo-600 dark:bg-indigo-400" />
                  )}
                  <Icon
                    size={15}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
                    )}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="shrink-0 p-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="text-[11px]">Pro Plan</span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
          </div>
        </div>
      )}
    </aside>
  );
}
