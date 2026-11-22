"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ContentPlanner } from "@/components/dashboard/content-planner";
import { PlatformIcon } from "@/components/platform-icon";

type Event = { id: string; title: string; scheduled_for: string; target_platforms: string[]; post_variants: { id: string; caption: string; platform: string }[] };

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
  const days = view === "day" ? [anchor] : view === "week" ?
    eachDayOfInterval({ start: startOfWeek(anchor), end: endOfWeek(anchor) }) :
    eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) });
  const from = startOfDay(days[0]).toISOString();
  const until = startOfDay(addDays(days[days.length - 1], 1)).toISOString();
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const query = new URLSearchParams({ status: "scheduled", limit: "100", from, until });
    async function reload() {
      try {
        const [response, queue] = await Promise.all([fetch("/api/posts?" + query, options), fetch("/api/scheduler/jobs", options)]);
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
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [from, until, refresh]);

  async function submit(post: Event, action: "publish" | "schedule" | "cancel" | "edit", nextTime = time) {
    if (action === "schedule" && (!nextTime || !Number.isFinite(Date.parse(nextTime)))) {
      toast.error("Choose a date and time.");
      return;
    }
    setPending(post.id);
    try {
      const path = action === "cancel" || action === "edit" ? "/api/posts/" + post.id : "/api/posts/" + action;
      const response = await fetch(path, {
        method: action === "cancel" ? "DELETE" : action === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "edit" ? { title: post.title, variants: post.post_variants } : {
          postId: post.id, scheduledFor: action === "schedule" ? new Date(nextTime).toISOString() : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success({ publish: "Queued for publishing", schedule: "Schedule updated", cancel: "Schedule cancelled", edit: "Post updated" }[action]);
      setEdit(undefined);
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the schedule");
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
      <div className="flex flex-wrap justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Publishing calendar</h1>
          <p className="text-sm text-muted-foreground">Times shown in {timezone || "your local timezone"}.</p></div>
        <Link className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground self-start" href="/dashboard/create-post">Create a post</Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border bg-card p-1" aria-label="Calendar view">
          {(["month", "week", "day"] as const).map((item) => <Button key={item} size="sm" variant={view === item ? "default" : "ghost"}
            aria-pressed={view === item} onClick={() => { setView(item); if (selected) setAnchor(new Date(selected + "T12:00")); setSelected(""); }}>{item[0].toUpperCase() + item.slice(1)}</Button>)}
        </div>
        <Button size="sm" variant="outline" onClick={() => { setAnchor(new Date()); setSelected(""); }}>Today</Button>
        <select aria-label="Filter calendar by platform" value={platform} className="rounded-md border bg-card px-2 py-2 text-sm" onChange={(event) => setPlatform(event.target.value)}>
          <option value="">All platforms</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option><option value="youtube">YouTube</option>
        </select>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <Button aria-label={"Previous " + view} size="sm" variant="outline" onClick={() => movePeriod(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <CardTitle className="text-base">{view === "month" ? format(month, "MMMM yyyy") : view === "day" ? format(anchor, "PPPP") : format(days[0], "MMM d") + " – " + format(days[6], "MMM d, yyyy")}</CardTitle>
          <Button aria-label={"Next " + view} size="sm" variant="outline" onClick={() => movePeriod(1)}><ChevronRight className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <div className={"grid gap-1 " + (view === "day" ? "grid-cols-1" : "grid-cols-7")}>
            {view !== "day" && ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className="text-center text-xs text-muted-foreground">{day}</span>)}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = grouped.get(key) ?? [];
              return <div key={key} data-date={key}
                className={"min-w-0 rounded-md border sm:min-h-16 " + (selected === key ? "border-primary bg-primary/10" : "hover:bg-muted/60")}
                onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-socialflow-post")) event.preventDefault(); }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("application/x-socialflow-post");
                  const post = posts.find((item) => item.id === id);
                  if (post && !pending && !items.includes(post)) void submit(post, "schedule", key + "T" + format(new Date(post.scheduled_for), "HH:mm"));
                }}>
                <button type="button" aria-pressed={key === selected} aria-label={format(day, "PPP") + ", " + items.length + " scheduled posts"}
                  className="flex min-h-9 w-full items-center justify-center gap-1 text-xs"
                  onClick={() => setSelected(key === selected ? "" : key)}>
                  {format(day, "d")}{items.length > 0 && <span className="rounded bg-muted px-1 text-foreground">{items.length}</span>}
                </button>
                {items.slice(0, view === "day" ? items.length : 3).map((post) => <button type="button" key={post.id} title={post.title}
                  draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-socialflow-post", post.id); event.dataTransfer.effectAllowed = "move"; }}
                  onClick={() => { setSelected(key); setEdit(post); setTime(format(new Date(post.scheduled_for), "yyyy-MM-dd'T'HH:mm")); }}
                  className="m-0.5 flex items-center gap-1 w-[calc(100%-0.25rem)] cursor-grab truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[10px] sm:text-xs">
                  <span aria-hidden="true" className="flex -space-x-1 shrink-0">
                    {post.target_platforms.map((p) => (
                      <PlatformIcon key={p} platform={p} className="h-3 w-3 rounded-full border border-background shadow-xs" />
                    ))}
                  </span>
                  <span className="truncate">{post.title}</span>
                </button>)}
              </div>;
            })}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {agenda.length === 0 && <p className="text-sm text-muted-foreground">{loaded ? "No posts scheduled for this selection." : "Loading scheduled posts…"}</p>}
        {agenda.map((post) => <Card key={post.id}>
          <CardHeader>
            <CardTitle className="text-base">{post.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
              <span>{new Date(post.scheduled_for).toLocaleString()}</span>
              <span>·</span>
              <div className="flex items-center gap-2">
                {post.target_platforms.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 font-medium text-foreground">
                    <PlatformIcon platform={p} className="h-3.5 w-3.5" />
                    <span className="capitalize">{p}</span>
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={Boolean(pending)} onClick={() => { setEdit(post); setTime(format(new Date(post.scheduled_for), "yyyy-MM-dd'T'HH:mm")); }}>Edit</Button>
              <Button size="sm" variant="outline" disabled={Boolean(pending)} onClick={() => void submit(post, "publish")}>Publish now</Button>
              <Button size="sm" variant="outline" disabled={Boolean(pending)} onClick={() => void submit(post, "cancel")}>Cancel schedule</Button>
            </div>
            {edit?.id === post.id && <div className="space-y-2 border-t pt-3">
              <label className="block text-sm">Title<Input value={edit.title} onChange={(event) => setEdit({ ...edit, title: event.target.value })} /></label>
              {edit.post_variants.map((variant) => <label key={variant.id} className="block text-sm capitalize">{variant.platform}
                <textarea value={variant.caption} className="block w-full rounded border bg-background p-2" onChange={(event) => setEdit({
                  ...edit, post_variants: edit.post_variants.map((item) => item.id === variant.id ? { ...item, caption: event.target.value } : item),
                })} /></label>)}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={Boolean(pending)} onClick={() => void submit(edit, "edit")}>Save copy</Button>
                <Input aria-label="New time" type="datetime-local" value={time} onChange={(event) => setTime(event.target.value)} />
                <Button size="sm" disabled={Boolean(pending)} onClick={() => void submit(edit, "schedule")}>Save new time</Button>
              </div>
            </div>}
          </CardContent>
        </Card>)}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Publishing queue</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {jobs.length ? <ul className="space-y-2">{jobs.slice(0, 15).map((job) => <li key={job.id} className="rounded border p-2">
            <span className="font-medium">{job.posts?.title || "Untitled post"}</span>
            <span className="ml-2 capitalize text-muted-foreground">{job.status} · {new Date(job.run_at).toLocaleString()}{job.retry_count > 0 ? " · Retry " + job.retry_count : ""}</span>
          </li>)}</ul> : <p className="text-muted-foreground">No queued or running jobs.</p>}
        </CardContent>
      </Card>
      <ContentPlanner />
    </div>
  );
}
