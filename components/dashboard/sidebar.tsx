"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioWaveform, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceNavigation } from "./navigation";

export function Sidebar({ close }: { close?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const ToggleIcon = close ? X : collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = close ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar";

  return <div className={cn("flex h-full flex-col bg-[#14241f] text-[#e8f4ee]", close ? "w-full" : collapsed ? "w-[74px]" : "w-56 xl:w-[248px]")}>
    <div className="flex h-[66px] shrink-0 items-center justify-between gap-1 border-b border-white/10 px-3">
      <Link href="/dashboard" onClick={close} aria-label="SocialFlow dashboard" className="flex min-w-0 items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#c4f4db] text-[#14241f]"><AudioWaveform size={17} /></span>
        {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">SocialFlow AI</span>}
      </Link>
      <button type="button" className="shrink-0 rounded-md p-1 text-emerald-50/70 hover:bg-white/10 hover:text-white" aria-label={toggleLabel}
        onClick={close ?? (() => setCollapsed((value) => !value))}><ToggleIcon size={16} /></button>
    </div>
    <nav aria-label="Workspace" className="min-h-0 grow space-y-4 overflow-y-auto px-3 py-4">
      {workspaceNavigation.map((group) => <div key={group.label} className="space-y-1">
        {!collapsed && <p className="px-2 pb-0.5 text-xs font-medium text-emerald-50/60">{group.label}</p>}
        {group.links.map(({ label, url, icon: Icon }) => <Link key={url} href={url} onClick={close} title={collapsed ? label : undefined}
          aria-label={collapsed ? label : undefined} aria-current={pathname === url ? "page" : undefined}
          className={cn("flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors", collapsed && "justify-center",
            pathname === url ? "bg-[#c4f4db] font-semibold text-[#14241f]" : "text-emerald-50/80 hover:bg-white/10 hover:text-white")}>
          <Icon size={16} className="shrink-0" />{!collapsed && <span className="truncate">{label}</span>}
        </Link>)}
      </div>)}
    </nav>
  </div>;
}
