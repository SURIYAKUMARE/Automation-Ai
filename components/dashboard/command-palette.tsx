"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  PlusCircle,
  Calendar,
  Sparkles,
  BarChart3,
  Share2,
  History,
  Video,
  Settings,
  Moon,
  Sun,
  X,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  url?: string;
  action?: () => void;
  category: "Actions" | "Navigation" | "Settings";
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
          const evt = new CustomEvent("open-command-palette");
          window.dispatchEvent(evt);
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const items: CommandItem[] = [
    {
      id: "create-post",
      title: "Create New Post",
      description: "Compose, generate AI copy & publish to social channels",
      icon: PlusCircle,
      url: "/dashboard/create-post",
      category: "Actions",
    },
    {
      id: "ai-studio",
      title: "AI Caption Studio",
      description: "Generate multi-platform copy, hashtags & hooks",
      icon: Sparkles,
      url: "/dashboard/caption-studio",
      category: "Actions",
    },
    {
      id: "calendar",
      title: "Content Calendar",
      description: "View scheduled releases across all networks",
      icon: Calendar,
      url: "/dashboard/calendar",
      category: "Navigation",
    },
    {
      id: "accounts",
      title: "Connected Accounts",
      description: "Manage Instagram, Facebook, LinkedIn & YouTube connections",
      icon: Share2,
      url: "/dashboard/accounts",
      category: "Navigation",
    },
    {
      id: "analytics",
      title: "Analytics & Insights",
      description: "Real publishing metrics and channel distribution",
      icon: BarChart3,
      url: "/dashboard/analytics",
      category: "Navigation",
    },
    {
      id: "history",
      title: "Publishing History",
      description: "Track delivered posts, retries & execution logs",
      icon: History,
      url: "/dashboard/history",
      category: "Navigation",
    },
    {
      id: "scripts",
      title: "Viral Script Studio",
      description: "Hook formulas and beat-by-beat video timing",
      icon: Video,
      url: "/dashboard/scripts",
      category: "Navigation",
    },
    {
      id: "whatsapp",
      title: "WhatsApp Dispatcher",
      description: "Manage direct messaging automation",
      icon: MessageSquare,
      url: "/dashboard/whatsapp",
      category: "Navigation",
    },
    {
      id: "toggle-theme",
      title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      description: "Toggle application appearance theme",
      icon: theme === "dark" ? Sun : Moon,
      action: () => setTheme(theme === "dark" ? "light" : "dark"),
      category: "Settings",
    },
    {
      id: "settings",
      title: "Workspace Settings",
      description: "Profile, brand voice & integration credentials",
      icon: Settings,
      url: "/dashboard/profile",
      category: "Settings",
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  const handleSelect = (item: CommandItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.url) {
      router.push(item.url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-background/50">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace..."
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted/80 focus:bg-indigo-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
          <span>SocialSync AI Command Palette</span>
          <div className="flex items-center gap-2">
            <span>Navigate</span>
            <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[10px] font-mono">↑↓</kbd>
            <span>Select</span>
            <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[10px] font-mono">↵</kbd>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
