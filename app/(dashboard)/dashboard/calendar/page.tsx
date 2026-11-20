"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Play,
  Share2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform } from "@/types";

interface ScheduledEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  platforms: SocialPlatform[];
  status: "scheduled" | "published" | "pending_approval";
  previewText: string;
}

export default function PublishingCalendarPage() {
  const [selectedFilter, setSelectedFilter] = React.useState<string>("all");
  const [isTriggering, setIsTriggering] = React.useState<string | null>(null);

  const events: ScheduledEvent[] = [
    {
      id: "ev-1",
      title: "Google Stitch UI/UX Release Announcement",
      date: "Nov 21, 2026",
      time: "10:00 AM UTC",
      platforms: ["linkedin", "instagram"],
      status: "scheduled",
      previewText: "Exploring the next evolution of intelligent social media automation with Stitch design...",
    },
    {
      id: "ev-2",
      title: "YouTube Studio Walkthrough & Feature Reel",
      date: "Nov 22, 2026",
      time: "03:30 PM UTC",
      platforms: ["youtube"],
      status: "scheduled",
      previewText: "Full walkthrough of automated video publishing and metadata generation with Gemini AI...",
    },
    {
      id: "ev-3",
      title: "Weekend Community Discussion & Engagement Poll",
      date: "Nov 23, 2026",
      time: "06:00 PM UTC",
      platforms: ["facebook", "linkedin"],
      status: "pending_approval",
      previewText: "What feature has saved you the most time this month? Let's discuss...",
    },
    {
      id: "ev-4",
      title: "Autonomous SaaS Milestone Update #4",
      date: "Nov 24, 2026",
      time: "11:15 AM UTC",
      platforms: ["linkedin", "instagram", "facebook"],
      status: "scheduled",
      previewText: "Behind the scenes on building multi-channel resilience and AES-256 encrypted OAuth...",
    },
  ];

  const handleRunNow = async (id: string, title: string) => {
    setIsTriggering(id);
    toast.loading(`Triggering immediate publishing for "${title}"...`);

    setTimeout(() => {
      setIsTriggering(null);
      toast.dismiss();
      toast.success(`Published "${title}" to connected platforms!`);
    }, 1500);
  };

  const filteredEvents =
    selectedFilter === "all"
      ? events
      : events.filter((e) => e.platforms.includes(selectedFilter as SocialPlatform));

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Publishing Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View scheduled campaigns, adjust publishing timelines, and trigger instant releases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/create-post">
            <Button variant="stitch" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Schedule New Post</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          {["all", "linkedin", "youtube", "instagram", "facebook"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedFilter(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                selectedFilter === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>Timezone:</span>
          <Badge variant="outline" className="font-mono text-xs">UTC</Badge>
        </div>
      </div>

      {/* Events Agenda Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((ev) => (
          <Card key={ev.id} className="border-border/80 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground line-clamp-1">{ev.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>{ev.date} at {ev.time}</span>
                  </div>
                </div>

                {ev.status === "scheduled" && (
                  <Badge variant="info" dot className="text-xs shrink-0">
                    Scheduled
                  </Badge>
                )}
                {ev.status === "pending_approval" && (
                  <Badge variant="warning" dot className="text-xs shrink-0">
                    Needs Approval
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground line-clamp-2 bg-accent/30 p-2.5 rounded-lg border border-border/40">
                "{ev.previewText}"
              </p>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">Targets:</span>
                <div className="flex gap-1">
                  {ev.platforms.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-slate-800 text-slate-300 px-2 py-0.5 text-[10px] font-mono capitalize border border-slate-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>

            <div className="border-t border-border/60 p-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-mono">ID: {ev.id}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunNow(ev.id, ev.title)}
                  disabled={isTriggering === ev.id}
                  className="h-7 text-xs gap-1.5 text-indigo-400 hover:text-indigo-300 border-indigo-500/30"
                >
                  <Play className={`h-3 w-3 ${isTriggering === ev.id ? "animate-spin" : ""}`} />
                  <span>Publish Now</span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
