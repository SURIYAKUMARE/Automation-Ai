"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Chart = { verified: boolean; source?: string; checkedAt?: string; message?: string; items: { id: string; title: string; chartPosition: number }[] };

export function TrendResearch() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("IN");
  const [chart, setChart] = useState<Chart>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/trends?" + new URLSearchParams({ query, region }));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setChart(data);
    } catch (failure) {
      setChart(undefined);
      setError(failure instanceof Error ? failure.message : "Could not check trends");
    } finally {
      setPending(false);
    }
  }

  return <Card>
    <CardHeader><CardTitle className="text-base">Trend research</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void search(); }}>
        <Input className="flex-1 min-w-32" aria-label="Relevant keywords" placeholder="Filter by keywords" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} />
        <Input className="w-16" aria-label="Two-letter region code" value={region} onChange={(event) => setRegion(event.target.value.toUpperCase())} maxLength={2} pattern="[A-Z]{2}" required />
        <Button type="submit" disabled={pending}>{pending ? "Checking…" : "Check YouTube chart"}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {chart && <div className="text-sm">
        <p className="text-muted-foreground">{chart.verified && chart.checkedAt ? chart.source + " · Checked " + new Date(chart.checkedAt).toLocaleString() : chart.message}</p>
        {chart.verified && (chart.items.length ? <ul className="mt-2 space-y-1">
          {chart.items.slice(0, 8).map((item) => <li key={item.id}><a className="underline" href={"https://www.youtube.com/watch?v=" + encodeURIComponent(item.id)} target="_blank" rel="noreferrer">#{item.chartPosition} {item.title}</a></li>)}
        </ul> : <p>No chart entries match these keywords.</p>)}
      </div>}
    </CardContent>
  </Card>;
}
