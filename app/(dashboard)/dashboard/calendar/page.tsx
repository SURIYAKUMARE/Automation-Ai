"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ContentPlanner } from "@/components/dashboard/content-planner";

type Event = { id: string; title: string; scheduled_for: string; target_platforms: string[]; post_variants: { id: string; caption: string; platform: string }[] };

export default function PublishingCalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState("");
  const [posts, setPosts] = useState<Event[]>([]);
  const [pending, setPending] = useState("");
  const [jobs, setJobs] = useState<{ id: string; run_at: string; status: string; retry_count: number; posts: { title?: string } | null }[]>([]);
  const [edit, setEdit] = useState<Event>();
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const reload = useCallback(async () => {
    try {
      const [response, queue] = await Promise.all([fetch("/api/posts?status=scheduled&limit=100"), fetch("/api/scheduler/jobs")]);
      if (queue.ok) setJobs((await queue.json()).jobs);
      if (!response.ok) throw new Error();
      setPosts((await response.json()).posts);
    } catch {
      toast.error("Could not load scheduled posts.");
    }
  }, []);
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    void reload();
    const refresh = window.setInterval(reload, 15_000);
    return () => window.clearInterval(refresh);
  }, [reload]);

  async function submit(post: Event, action: "publish" | "schedule" | "cancel" | "edit") {
    if (action === "schedule" && (!time || !Number.isFinite(Date.parse(time)))) {
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
          postId: post.id, scheduledFor: action === "schedule" ? new Date(time).toISOString() : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success({ publish: "Queued for publishing", schedule: "Schedule updated", cancel: "Schedule cancelled", edit: "Post updated" }[action]);
      setEdit(undefined);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the schedule");
    } finally {
      setPending("");
    }
  }

  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) });
  const grouped = new Map<string, Event[]>();
  for (const post of posts) {
    if (!post.scheduled_for) continue;
    const key = format(new Date(post.scheduled_for), "yyyy-MM-dd");
    grouped.set(key, [...(grouped.get(key) || []), post]);
  }
  const agenda = selected ? grouped.get(selected) || [] : posts.filter((post) => post.scheduled_for && format(new Date(post.scheduled_for), "yyyy-MM") === format(month, "yyyy-MM"));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Publishing calendar</h1>
          <p className="text-sm text-muted-foreground">Times shown in {timezone || "your local timezone"}.</p></div>
        <Link className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground self-start" href="/dashboard/create-post">Create a post</Link>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <Button aria-label="Previous month" size="sm" variant="outline" onClick={() => { setMonth(addMonths(month, -1)); setSelected(""); }}><ChevronLeft className="h-4 w-4" /></Button>
          <CardTitle className="text-base">{format(month, "MMMM yyyy")}</CardTitle>
          <Button aria-label="Next month" size="sm" variant="outline" onClick={() => { setMonth(addMonths(month, 1)); setSelected(""); }}><ChevronRight className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className="text-center text-xs text-muted-foreground">{day}</span>)}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const count = grouped.get(key)?.length ?? 0;
              return <button type="button" key={key} aria-pressed={key === selected} aria-label={format(day, "PPP") + ", " + count + " scheduled posts"}
                className={"flex min-h-10 items-center justify-center gap-1 rounded-md border text-xs " + (selected === key ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                onClick={() => setSelected(key === selected ? "" : key)}>
                {format(day, "d")}{count > 0 && <span className="rounded bg-muted px-1 text-foreground">{count}</span>}
              </button>;
            })}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {agenda.length === 0 && <p className="text-sm text-muted-foreground">No posts scheduled for this selection.</p>}
        {agenda.map((post) => <Card key={post.id}>
          <CardHeader><CardTitle className="text-base">{post.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{new Date(post.scheduled_for).toLocaleString()} · {post.target_platforms.join(", ")}</p></CardHeader>
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
