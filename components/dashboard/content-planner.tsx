"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Idea = { day: string; suggestedTitle: string; targetPlatform: string; focus: string; rationale: string };
export function ContentPlanner() {
  const [theme, setTheme] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [pending, setPending] = useState(false);
  const [timingPending, setTimingPending] = useState(false);
  const [timing, setTiming] = useState<{ timezone: string; basis: string; suggestions: { platform: string; hour: number; samples: number }[] }>();

  async function checkTimes() {
    setTimingPending(true);
    try {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const profile = await fetch("/api/profile").then((response) => response.ok ? response.json() : null).catch(() => null);
      const timezone = profile?.profile?.timezone || local;
      const response = await fetch("/api/scheduler/suggestions?" + new URLSearchParams({ timezone }));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTiming(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check posting times");
    } finally {
      setTimingPending(false);
    }
  }
  async function plan() {
    setPending(true);
    try {
      const response = await fetch("/api/ai/content-calendar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setIdeas(result.schedule);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a plan");
    } finally {
      setPending(false);
    }
  }
  return <Card>
    <CardHeader><CardTitle className="text-base">Weekly content ideas</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void plan(); }}>
        <Input className="flex-1 min-w-40" aria-label="Weekly theme" placeholder="What are you posting about this week?" value={theme}
          onChange={(event) => setTheme(event.target.value)} maxLength={500} required />
        <Button type="submit" disabled={pending || !theme.trim()}>{pending ? "Generating…" : "Suggest a plan"}</Button>
      </form>
      {ideas.length > 0 && <ol className="grid gap-2 text-sm sm:grid-cols-2">{ideas.map((idea, index) => <li key={index} className="rounded border p-3">
        <p className="text-xs capitalize text-muted-foreground">{idea.day} · {idea.targetPlatform}</p>
        <p className="font-medium">{idea.suggestedTitle}</p><p>{idea.focus}</p><p className="mt-1 text-xs text-muted-foreground">{idea.rationale}</p>
      </li>)}</ol>}
      <div className="space-y-2 border-t pt-3">
        <Button size="sm" variant="outline" disabled={timingPending} onClick={() => void checkTimes()}>
          {timingPending ? "Checking…" : "Suggest posting times"}
        </Button>
        {timing && (timing.suggestions.length ? <div className="space-y-1 text-sm">
          <p>{timing.basis} · {timing.timezone}</p>
          <ul>{timing.suggestions.map((item) => <li key={item.platform} className="capitalize">
            {item.platform} · {String(item.hour).padStart(2, "0")}:00–{String(item.hour + 4).padStart(2, "0")}:00 · {item.samples} posts
          </li>)}</ul>
        </div> : <p className="text-sm text-muted-foreground">More published posts with provider metrics are needed for a timing suggestion.</p>)}
      </div>
    </CardContent>
  </Card>;
}
