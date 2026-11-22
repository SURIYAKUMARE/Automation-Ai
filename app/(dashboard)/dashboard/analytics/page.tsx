"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon } from "@/components/platform-icon";
import { SocialPlatform } from "@/types";

const metricKeys = ["views", "likes", "comments", "shares", "reach", "impressions"] as const;
type Metric = typeof metricKeys[number];
type Row = { id: string; title: string; platform: SocialPlatform; status: string; syncedAt: string | null; metrics: Record<Metric, number | null> };
type Overview = { totalPosts: number; failedPosts: number; queuedPosts: number; connectedPlatforms: number };
type Audience = { id: string; platform: SocialPlatform; name: string; count: number | null; change: number | null; since: string | null; observedOn: string | null; rounded: boolean };

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const [posts, setPosts] = useState<Row[]>([]);
  const [overview, setOverview] = useState<Overview>();
  const [rowsPending, setRowsPending] = useState(true);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<Audience[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/overview?days=" + days, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setOverview((await response.json()).overview);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load the publishing summary."); });
    return () => controller.abort();
  }, [days]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/posts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setPosts((await response.json()).posts);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load provider metrics."); })
      .finally(() => { if (!controller.signal.aborted) setRowsPending(false); });
    fetch("/api/analytics/accounts", { signal: controller.signal })
      .then(async (response) => { if (response.ok) setAudience((await response.json()).accounts); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const completed = overview ? (overview.totalPosts ?? 0) + (overview.failedPosts ?? 0) : 0;
  const publishedRate = overview && completed ? (100 * overview.totalPosts / completed).toFixed(1) + "%" : "—";
  const cards = [
    ["Published posts", overview?.totalPosts], ["Posts with failures", overview?.failedPosts],
    ["Publication success rate", publishedRate],
    ["Scheduled or in progress", overview?.queuedPosts], ["Connected accounts", overview?.connectedPlatforms],
  ] as const;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Publishing outcomes and metrics from connected accounts.</p></div>
        <label className="text-sm">Publishing summary
          <select value={days} onChange={(event) => { setOverview(undefined); setDays(event.target.value); }} className="ml-2 rounded border bg-card p-2">
            <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map(([title, count]) => <Card key={title}><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{count ?? "—"}</p>
        </CardContent></Card>)}
      </div>
      <Card>
        <CardHeader className="flex-row justify-between gap-3">
          <CardTitle className="text-base">Recent platform outcomes</CardTitle>
          <a className="text-sm underline" href="/api/analytics/export">Export CSV</a>
        </CardHeader>
        <CardContent>
          <p className="pb-3 text-xs text-muted-foreground">A dash indicates a metric the provider has not supplied. Counts and definitions vary by platform.</p>
          {rowsPending ? <p role="status">Loading metrics…</p> : !posts.length ? <p className="text-sm">No platform outcomes recorded yet.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead><tr className="border-b"><th className="p-2">Post</th><th className="p-2">Status</th>
                {metricKeys.map((key) => <th key={key} className="p-2 capitalize">{key}</th>)}
                <th className="p-2">Engagement rate</th><th className="p-2">Synced</th>
              </tr></thead>
              <tbody>{posts.map((row) => <tr key={row.id} className="border-b">
                <th scope="row" className="p-2 font-medium"><span className="flex items-center gap-2"><PlatformIcon platform={row.platform} className="h-4 w-4" />{row.title}</span><span className="capitalize text-xs text-muted-foreground">{row.platform}</span></th>
                <td className="p-2 capitalize">{row.status.replaceAll("_", " ")}</td>
                {metricKeys.map((key) => <td key={key} className="p-2 tabular-nums">{row.metrics[key]?.toLocaleString() ?? "—"}</td>)}
                <td className="p-2 tabular-nums" title="Likes and comments divided by impressions">
                  {row.metrics.impressions && row.metrics.likes !== null && row.metrics.comments !== null
                    ? ((row.metrics.likes + row.metrics.comments) * 100 / row.metrics.impressions).toFixed(1) + "%" : "—"}
                </td>
                <td className="p-2 whitespace-nowrap">{row.syncedAt ? new Date(row.syncedAt).toLocaleString() : "—"}</td>
              </tr>)}</tbody>
            </table></div>
          )}
        </CardContent>
      </Card>
      {audience.length > 0 && <Card>
        <CardHeader><CardTitle className="text-base">Account audience</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {audience.map((item) => <div key={item.id} className="rounded border p-3 text-sm">
            <p className="flex items-center gap-2 font-medium"><PlatformIcon platform={item.platform} className="h-4 w-4" />{item.name}</p>
            <p className="text-xl font-semibold">{item.count?.toLocaleString() ?? "—"}</p>
            <p className="text-muted-foreground">{item.platform === "youtube" ? "Subscribers" : "Followers"}{item.rounded ? " · Rounded by YouTube" : ""}</p>
            {item.observedOn && <p className="text-xs text-muted-foreground">Observed {item.observedOn}</p>}
            {item.change !== null && <p className="mt-1 text-xs">{item.change > 0 ? "+" : ""}{item.change.toLocaleString()} since {item.since}</p>}
          </div>)}
        </CardContent>
      </Card>}
    </div>
  );
}
