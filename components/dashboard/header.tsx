"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings2,
  Sun,
  Video,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { workspaceLinks } from "./navigation";
import { CommandPalette } from "./command-palette";

type User = { name: string; email: string };
type Notification = { id: string; title: string; message: string; is_read: boolean; link?: string | null };
const control = "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/80 px-2.5 text-xs font-medium hover:bg-muted/80 text-foreground transition-all shadow-xs";

export function Header({ user, openMenu }: { user: User; openMenu: () => void }) {
  const pathname = usePathname();
  const pageTitle = workspaceLinks.find((item) => item.url === pathname)?.label ?? (pathname.endsWith("/search") ? "Search" : "Workspace");
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>();
  const [notificationError, setNotificationError] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setCommandPaletteOpen(true);
    window.addEventListener("open-command-palette", handleOpen);
    return () => window.removeEventListener("open-command-palette", handleOpen);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/notifications", { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setNotifications(data.notifications);
        setNotificationError(false);
      } catch {
        if (!controller.signal.aborted) setNotificationError(true);
      }
    }
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  const unread = notifications?.filter((notice) => !notice.is_read).length ?? 0;
  async function markRead() {
    const response = await fetch("/api/notifications", { method: "PATCH" }).catch(() => null);
    if (!response?.ok) { toast.error("Could not mark notifications as read"); return; }
    setNotifications((current) => current?.map((item) => ({ ...item, is_read: true })));
  }
  async function signOut() {
    const response = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    if (!response?.ok) { toast.error("Could not sign out"); return; }
    window.location.assign(new URL("/login", window.location.origin));
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/85 backdrop-blur-md">
        <div className="flex h-16 min-w-0 items-center gap-2.5 px-3 sm:px-6">
          <button type="button" aria-label="Open navigation" className={control + " lg:hidden"} onClick={openMenu}>
            <Menu className="h-4 w-4" />
          </button>
          
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="truncate text-sm sm:text-base font-bold tracking-tight text-foreground">
              {pageTitle}
            </span>
          </div>

          {/* Global Search / Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex min-w-0 items-center gap-2.5 rounded-xl border border-border/70 bg-background/60 hover:bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground transition-all shadow-xs"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="w-28 lg:w-44 text-left truncate">Search or jump to...</span>
            <kbd className="rounded border border-border/80 bg-muted/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className={control + " md:hidden"}
            aria-label="Search workspace"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            href="/dashboard/scripts"
            className="hidden md:inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-2.5 sm:px-3 text-xs font-medium hover:bg-muted/80 text-foreground transition-all shadow-xs"
            aria-label="Script Studio"
          >
            <Video className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden lg:inline">Scripts</span>
          </Link>

          <Link
            href="/dashboard/whatsapp"
            className="hidden md:inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-2.5 sm:px-3 text-xs font-medium hover:bg-muted/80 text-foreground transition-all shadow-xs"
            aria-label="WhatsApp"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden lg:inline">WhatsApp</span>
          </Link>

          {/* Create Post Button with Indigo/Violet Theme */}
          <Link
            href="/dashboard/create-post"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-3 sm:px-3.5 text-xs font-semibold shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all"
            aria-label="Create post"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Post</span>
          </Link>

          {/* Notifications Dropdown */}
          <details className="static sm:relative">
            <summary className={control + " relative cursor-pointer list-none"} aria-label={unread ? unread + " unread notifications" : "Notifications"}>
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
            </summary>
            <div className="absolute left-2 right-2 top-full mt-2 rounded-2xl border border-border/80 bg-card p-3 shadow-xl sm:left-auto sm:right-0 sm:w-80 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                <h2 className="text-xs font-semibold text-foreground">Notifications</h2>
                {unread > 0 && (
                  <button type="button" className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium" onClick={() => void markRead()}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="mt-2 max-h-80 divide-y divide-border/40 overflow-y-auto">
                {notificationError && <p className="py-3 text-xs text-muted-foreground text-center">Notifications are unavailable.</p>}
                {!notificationError && !notifications && <p className="py-3 text-xs text-muted-foreground text-center">Loading notifications…</p>}
                {notifications?.length === 0 && !notificationError && <p className="py-3 text-xs text-muted-foreground text-center">No notifications yet.</p>}
                {notifications?.map((notice) => (
                  <div key={notice.id} className="py-2.5 first:pt-1">
                    {notice.link?.startsWith("/dashboard") && !notice.link.startsWith("//") ? (
                      <Link
                        href={notice.link}
                        className="text-xs font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline block"
                        onClick={(event) => {
                          const panel = event.currentTarget.closest("details");
                          if (panel) panel.open = false;
                        }}
                      >
                        {notice.title}
                      </Link>
                    ) : (
                      <p className="text-xs font-semibold text-foreground">{notice.title}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{notice.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Profile Dropdown */}
          <details className="relative">
            <summary className={control + " cursor-pointer list-none pl-1.5 gap-1.5"} aria-label="Profile menu">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-[11px] font-bold text-white shadow-xs">
                {(user.name || user.email || "S").slice(0, 1).toUpperCase()}
              </span>
              <ChevronDown className="hidden h-3 w-3 sm:block text-muted-foreground" />
            </summary>
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xl backdrop-blur-xl">
              <div className="mb-1 border-b border-border/60 p-2.5">
                <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 rounded-xl p-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                onClick={(event) => {
                  const panel = event.currentTarget.closest("details");
                  if (panel) panel.open = false;
                }}
              >
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                Settings &amp; Accounts
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                {theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
              </button>
              <div className="my-1 border-t border-border/50" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => void signOut()}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>

      {/* Interactive Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
}
