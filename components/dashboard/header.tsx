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
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-14 min-w-0 items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: Mobile hamburger & Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground lg:hidden"
              onClick={openMenu}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground hidden sm:inline">Workspace</span>
              <span className="text-muted-foreground/50 hidden sm:inline">/</span>
              <span className="font-semibold text-foreground truncate">{pageTitle}</span>
            </div>
          </div>

          {/* Right: Search, Quick links, Notifications & User */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 rounded-md border border-border bg-muted/40 hover:bg-muted/80 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Search workspace"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="w-24 lg:w-36 text-left truncate">Search...</span>
              <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground md:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Quick Links */}
            <Link
              href="/dashboard/scripts"
              className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card hover:bg-muted/60 px-2.5 text-xs font-medium text-foreground transition-colors"
            >
              <Video className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Scripts</span>
            </Link>

            <Link
              href="/dashboard/whatsapp"
              className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card hover:bg-muted/60 px-2.5 text-xs font-medium text-foreground transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp</span>
            </Link>

            {/* Notifications Popover */}
            <details className="relative">
              <summary
                className="inline-flex size-8 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground relative transition-colors"
                aria-label={unread ? `${unread} unread notifications` : "Notifications"}
              >
                <Bell className="h-3.5 w-3.5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-indigo-600" />
                )}
              </summary>
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-lg z-50">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="text-xs font-semibold text-foreground">Notifications</h3>
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={() => void markRead()}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-border/60">
                  {notificationError && <p className="py-3 text-xs text-muted-foreground text-center">Notifications unavailable.</p>}
                  {!notificationError && !notifications && <p className="py-3 text-xs text-muted-foreground text-center">Loading...</p>}
                  {notifications?.length === 0 && !notificationError && <p className="py-3 text-xs text-muted-foreground text-center">No notifications yet.</p>}
                  {notifications?.map((notice) => (
                    <div key={notice.id} className="py-2.5 first:pt-1">
                      {notice.link?.startsWith("/dashboard") && !notice.link.startsWith("//") ? (
                        <Link
                          href={notice.link}
                          className="text-xs font-medium text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 block"
                          onClick={(e) => {
                            const panel = e.currentTarget.closest("details");
                            if (panel) panel.open = false;
                          }}
                        >
                          {notice.title}
                        </Link>
                      ) : (
                        <p className="text-xs font-medium text-foreground">{notice.title}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{notice.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            {/* Profile Dropdown */}
            <details className="relative">
              <summary
                className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Profile menu"
              >
                <span className="grid size-5 place-items-center rounded bg-indigo-600 text-[10px] font-semibold text-white">
                  {(user.name || user.email || "S").slice(0, 1).toUpperCase()}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
              </summary>
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg z-50">
                <div className="p-2 border-b border-border mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                  onClick={(e) => {
                    const panel = e.currentTarget.closest("details");
                    if (panel) panel.open = false;
                  }}
                >
                  <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors text-left"
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
}
