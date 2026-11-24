"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Clock,
  Send,
  Trash2,
  Edit3,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ContentPlanner } from "@/components/dashboard/content-planner";
import { PlatformIcon } from "@/components/platform-icon";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  scheduled_for: string;
  target_platforms: string[];
  post_variants: { id: string; caption: string; platform: string }[];
};

export default function PublishingCalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [platform, setPlatform] = useState("");
  const [selected, setSelected] = useState("");
  const [posts, setPosts] = useState<Event[]>([]);
  const [pending, setPending] = useState("");
  const [jobs, setJobs] = useState<{ id: string; run_at: string; status: string; retry_count: number; posts: { title?: string } | null }[]>([]);
  const [edit, setEdit] = useState<Event>();
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const month = startOfMonth(anchor);
  const days =
    view === "day"
      ? [anchor]
      : view === "week"
      ? eachDayOfInterval({ start: startOfWeek(anchor), end: endOfWeek(anchor) })
      : eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) });

  const from = startOfDay(days[0]).toISOString();
  const until = startOfDay(addDays(days[days.length - 1], 1)).toISOString();

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const query = new URLSearchParams({ status: "scheduled", limit: "100", from, until });

    async function reload() {
      try {
        const [response, queue] = await Promise.all([
          fetch("/api/posts?" + query, options),
          fetch("/api/scheduler/jobs", options),
        ]);
        if (queue.ok) setJobs((await queue.json()).jobs);
        if (!response.ok) throw new Error();
        setPosts((await response.json()).posts);
        setLoaded(true);
      } catch {
        if (!controller.signal.aborted) toast.error("Could not load scheduled posts.");
      }
    }
    void reload();
    const timer = window.setInterval(reload, 15_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [from, until, refresh]);

  async function submit(post: Event, action: "publish" | "schedule" | "cancel" | "edit", nextTime = time) {
    if (action === "schedule" && (!nextTime || !Number.isFinite(Date.parse(nextTime)))) {
      toast.error("Choose a date and time.");
      return;
    }
    setPending(post.id);
    const notice = toast.loading(
      action === "publish" ? "Publishing now..." : action === "cancel" ? "Cancelling schedule..." : "Updating post..."
    );
    try {
      const path = action === "cancel" || action === "edit" ? "/api/posts/" + post.id : "/api/posts/" + action;
      const response = await fetch(path, {
        method: action === "cancel" ? "DELETE" : action === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "edit"
            ? { title: post.title, variants: post.post_variants }
            : {
                postId: post.id,
                scheduledFor: action === "schedule" ? new Date(nextTime).toISOString() : undefined,
              }
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(
        {
          publish: "Queued for instant publishing!",
          schedule: "Schedule updated successfully!",
          cancel: "Scheduled release cancelled",
          edit: "Post copy updated successfully!",
        }[action],
        { id: notice }
      );
      setEdit(undefined);
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the schedule", { id: notice });
    } finally {
      setPending("");
    }
  }

  function movePeriod(direction: number) {
    const move = view === "month" ? addMonths : view === "week" ? addWeeks : addDays;
    setAnchor(move(anchor, direction));
    setSelected("");
  }

  const grouped = new Map<string, Event[]>();
  for (const post of posts) {
    if (!post.scheduled_for || (platform && !post.target_platforms.includes(platform))) continue;
    const key = format(new Date(post.scheduled_for), "yyyy-MM-dd");
    grouped.set(key, [...(grouped.get(key) || []), post]);
  }
  const agenda = selected ? grouped.get(selected) || [] : days.flatMap((day) => grouped.get(format(day, "yyyy-MM-dd")) ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Content Calendar</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Interactive Schedule
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Times displayed in <span className="font-mono text-foreground font-medium">{timezone || "local timezone"}</span>. Drag cards to reschedule.
          </p>
        </div>

        <Link href="/dashboard/create-post">
          <Button variant="stitch" size="sm" className="gap-1.5 text-xs rounded-xl h-9 shadow-md shadow-indigo-500/20">
            <Plus size={14} />
            <span>Schedule Post</span>
          </Button>
        </Link>
      </div>

      {/* Control Bar: View Switcher, Filter, Today */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex gap-1 rounded-xl bg-muted/60 p-1 text-xs" aria-label="Calendar view">
            {(["month", "week", "day"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setView(item);
                  if (selected) setAnchor(new Date(selected + "T12:00"));
                  setSelected("");
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                  view === item ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAnchor(new Date());
              setSelected("");
            }}
            className="h-8 text-xs rounded-xl border-border/80"
          >
            Today
          </Button>

          {/* Platform Filter */}
          <select
            aria-label="Filter calendar by platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-8 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Channels</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => movePeriod(-1)}
            aria-label={`Previous ${view}`}
            className="h-8 w-8 p-0 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold text-foreground min-w-[130px] text-center">
            {view === "month"
              ? format(month, "MMMM yyyy")
              : view === "day"
              ? format(anchor, "PPP")
              : `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => movePeriod(1)}
            aria-label={`Next ${view}`}
            className="h-8 w-8 p-0 rounded-xl"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <Card className="rounded-2xl border-border/70 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className={cn("grid gap-1.5", view === "day" ? "grid-cols-1" : "grid-cols-7")}>
            {view !== "day" &&
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-2">
                  {day}
                </div>
              ))}

            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = grouped.get(key) ?? [];
              const isToday = isSameDay(day, new Date());
              const isSelected = selected === key;

              return (
                <div
                  key={key}
                  data-date={key}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("application/x-socialflow-post")) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("application/x-socialflow-post");
                    const post = posts.find((item) => item.id === id);
                    if (post && !pending && !items.includes(post)) {
                      void submit(post, "schedule", key + "T" + format(new Date(post.scheduled_for), "HH:mm"));
                    }
                  }}
                  className={cn(
                    "min-h-24 sm:min-h-28 p-1.5 rounded-xl border transition-all flex flex-col justify-between group",
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/5 shadow-xs"
                      : isToday
                      ? "border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-950/20"
                      : "border-border/60 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => setSelected(isSelected ? "" : key)}
                      className={cn(
                        "h-6 w-6 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors",
                        isToday
                          ? "bg-indigo-600 text-white"
                          : isSelected
                          ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                    {items.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded-md">
                        {items.length}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Items in cell */}
                  <div className="space-y-1 overflow-hidden grow">
                    {items.slice(0, view === "day" ? items.length : 3).map((post) => (
                      <div
                        key={post.id}
                        title={post.title}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-socialflow-post", post.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => {
                          setSelected(key);
                          setEdit(post);
                          setTime(format(new Date(post.scheduled_for), "yyyy-MM-dd'T'HH:mm"));
                        }}
                        className="p-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-foreground cursor-grab active:cursor-grabbing text-[10px] font-medium transition-colors flex items-center gap-1"
                      >
                        <div className="flex -space-x-1 shrink-0">
                          {post.target_platforms.map((p) => (
                            <PlatformIcon key={p} platform={p} className="h-3 w-3 rounded-full border border-card shadow-2xs" />
                          ))}
                        </div>
                        <span className="truncate">{post.title}</span>
                      </div>
                    ))}
                    {items.length > 3 && view !== "day" && (
                      <span className="text-[9px] text-muted-foreground block text-center font-mono">
                        +{items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Agenda & Edit Modal */}
      <div className="grid gap-4 md:grid-cols-2">
        {agenda.length === 0 ? (
          <div className="md:col-span-2 p-8 rounded-2xl border border-dashed border-border/70 text-center space-y-2">
            <CalendarDays className="h-8 w-8 text-muted-foreground/60 mx-auto" />
            <p className="text-xs font-semibold text-foreground">No posts scheduled for this timeframe</p>
            <p className="text-[11px] text-muted-foreground">
              Queue your upcoming social posts using the Post Composer or AI Studio.
            </p>
          </div>
        ) : (
          agenda.map((post) => (
            <Card key={post.id} className="rounded-2xl border-border/70 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/50">
                <div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-1">{post.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{new Date(post.scheduled_for).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {post.target_platforms.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 capitalize font-medium text-foreground">
                          <PlatformIcon platform={p} className="h-3 w-3" />
                          <span>{p}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={Boolean(pending)}
                  onClick={() => {
                    setEdit(post);
                    setTime(format(new Date(post.scheduled_for), "yyyy-MM-dd'T'HH:mm"));
                  }}
                  className="h-7 text-xs rounded-lg gap-1"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="stitch"
                  disabled={Boolean(pending)}
                  onClick={() => void submit(post, "publish")}
                  className="h-7 text-xs rounded-lg gap-1 shadow-xs"
                >
                  <Send size={12} />
                  <span>Publish Now</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={Boolean(pending)}
                  onClick={() => void submit(post, "cancel")}
                  className="h-7 text-xs rounded-lg gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                >
                  <Trash2 size={12} />
                  <span>Cancel</span>
                </Button>
              </div>

              {/* In-place Edit Drawer */}
              {edit?.id === post.id && (
                <div className="space-y-3 pt-3 border-t border-border/50 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Post Title</label>
                    <Input
                      value={edit.title}
                      onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>

                  {edit.post_variants.map((variant) => (
                    <div key={variant.id} className="space-y-1">
                      <label className="text-[10px] font-semibold capitalize text-muted-foreground flex items-center gap-1">
                        <PlatformIcon platform={variant.platform} className="h-3 w-3" />
                        <span>{variant.platform} Caption</span>
                      </label>
                      <textarea
                        value={variant.caption}
                        rows={3}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            post_variants: edit.post_variants.map((item) =>
                              item.id === variant.id ? { ...item, caption: e.target.value } : item
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-input bg-background p-2 text-xs leading-relaxed focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="stitch"
                      disabled={Boolean(pending)}
                      onClick={() => void submit(edit, "edit")}
                      className="h-7 text-xs rounded-lg"
                    >
                      Save Copy
                    </Button>
                    <div className="flex items-center gap-1.5 grow">
                      <Input
                        type="datetime-local"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="h-7 text-[11px] font-mono rounded-lg grow"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(pending)}
                        onClick={() => void submit(edit, "schedule")}
                        className="h-7 text-xs rounded-lg"
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* AI Content Weekly Planner Component */}
      <ContentPlanner />
    </div>
  );
}
