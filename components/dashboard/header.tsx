"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Moon, Plus, Search, Settings2, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { workspaceLinks } from "./navigation";

type User = { name: string; email: string };
type Notification = { id: string; title: string; message: string; is_read: boolean; link?: string | null };
const control = "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-2.5 text-sm font-medium hover:bg-muted";

export function Header({ user, openMenu }: { user: User; openMenu: () => void }) {
  const pathname = usePathname();
  const pageTitle = workspaceLinks.find((item) => item.url === pathname)?.label ?? (pathname.endsWith("/search") ? "Search" : "Workspace");
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>();
  const [notificationError, setNotificationError] = useState(false);

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

  return <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
    <div className="flex h-[66px] min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6">
      <button type="button" aria-label="Open navigation" className={control + " lg:hidden"} onClick={openMenu}><Menu className="h-4 w-4" /></button>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{pageTitle}</span>
      <form action="/dashboard/search" className="hidden min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 md:flex">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input name="q" maxLength={100} required aria-label="Search workspace" placeholder="Search posts and media"
          className="h-9 w-36 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-48" />
      </form>
      <Link href="/dashboard/search" className={control + " md:hidden"} aria-label="Search workspace"><Search className="h-4 w-4" /></Link>
      <Link href="/dashboard/create-post" className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#bef5e4] px-2.5 text-sm font-semibold text-[#173832] hover:bg-[#a7efda] sm:px-3" aria-label="Quick create post"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Create</span></Link>
      <details className="static sm:relative">
        <summary className={control + " relative cursor-pointer list-none"} aria-label={unread ? unread + " unread notifications" : "Notifications"}><Bell className="h-4 w-4" />{unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />}</summary>
        <div className="absolute left-2 right-2 top-full mt-2 rounded-xl border border-border bg-card p-3 shadow-xl sm:left-auto sm:right-0 sm:w-80">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Notifications</h2>
            {unread > 0 && <button type="button" className="text-xs text-primary hover:underline" onClick={() => void markRead()}>Mark all read</button>}</div>
          <div className="mt-2 max-h-80 divide-y overflow-y-auto">
            {notificationError && <p className="py-2 text-sm text-muted-foreground">Notifications are unavailable.</p>}
            {!notificationError && !notifications && <p className="py-2 text-sm text-muted-foreground">Loading…</p>}
            {notifications?.length === 0 && !notificationError && <p className="py-2 text-sm text-muted-foreground">No notifications yet.</p>}
            {notifications?.map((notice) => <div key={notice.id} className="py-2">
              {notice.link?.startsWith("/dashboard") && !notice.link.startsWith("//") ? <Link href={notice.link} className="text-sm font-semibold hover:underline" onClick={(event) => { const panel = event.currentTarget.closest("details"); if (panel) panel.open = false; }}>{notice.title}</Link> : <p className="text-sm font-semibold">{notice.title}</p>}
              <p className="text-xs text-muted-foreground">{notice.message}</p>
            </div>)}
          </div>
        </div>
      </details>
      <details className="relative">
        <summary className={control + " cursor-pointer list-none pl-1.5"} aria-label="Profile menu"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{(user.name || user.email || "S").slice(0, 1).toUpperCase()}</span><ChevronDown className="hidden h-3 w-3 sm:block" /></summary>
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl">
          <div className="mb-1 border-b p-2"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
          <Link href="/dashboard/profile" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted" onClick={(event) => { const panel = event.currentTarget.closest("details"); if (panel) panel.open = false; }}><Settings2 className="h-4 w-4" />Settings</Link>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === "dark" ? "Light theme" : "Dark theme"}</button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </details>
    </div>
  </header>;
}
