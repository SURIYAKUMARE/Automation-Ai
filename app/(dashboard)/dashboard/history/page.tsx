"use client";

import * as React from "react";
import {
  History as HistoryIcon,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform, PostStatus } from "@/types";

interface PostHistoryEntry {
  id: string;
  title: string;
  date: string;
  status: PostStatus;
  mode: "automatic" | "manual_approval";
  targets: Array<{
    platform: SocialPlatform;
    status: PostStatus;
    externalPostUrl?: string;
    externalPostId?: string;
    errorMessage?: string;
  }>;
}

export default function PostHistoryPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [inspectItem, setInspectItem] = React.useState<PostHistoryEntry | null>(null);

  const posts: PostHistoryEntry[] = [
    {
      id: "post-882",
      title: "Autonomous Multi-Platform Distribution Architecture",
      date: "Nov 20, 2026, 04:30 PM",
      status: "published",
      mode: "automatic",
      targets: [
        {
          platform: "linkedin",
          status: "published",
          externalPostId: "urn:li:ugcPost:72635489102948271",
          externalPostUrl: "https://www.linkedin.com/feed/update/urn:li:ugcPost:72635489102948271/",
        },
        {
          platform: "youtube",
          status: "published",
          externalPostId: "dQw4w9WgXcQ",
          externalPostUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      ],
    },
    {
      id: "post-881",
      title: "Google Stitch Design System in Action",
      date: "Nov 19, 2026, 02:15 PM",
      status: "published",
      mode: "manual_approval",
      targets: [
        {
          platform: "instagram",
          status: "published",
          externalPostId: "17948291048291048",
          externalPostUrl: "https://www.instagram.com/p/C_abc1234/",
        },
        {
          platform: "facebook",
          status: "published",
          externalPostId: "102948201948201_1029482029384",
          externalPostUrl: "https://www.facebook.com/102948201948201_1029482029384",
        },
      ],
    },
    {
      id: "post-880",
      title: "Weekend Community Q&A Flyer",
      date: "Nov 18, 2026, 11:00 AM",
      status: "failed",
      mode: "automatic",
      targets: [
        {
          platform: "instagram",
          status: "failed",
          errorMessage: "IG_CONTAINER_FAILED_400: Image aspect ratio must be between 4:5 and 1.91:1",
        },
      ],
    },
    {
      id: "post-879",
      title: "SocialSync AI Launch Keynote Trailer",
      date: "Nov 17, 2026, 09:30 AM",
      status: "published",
      mode: "manual_approval",
      targets: [
        {
          platform: "youtube",
          status: "published",
          externalPostId: "yt_vid_94820",
          externalPostUrl: "https://www.youtube.com/watch?v=yt_vid_94820",
        },
        {
          platform: "linkedin",
          status: "published",
          externalPostId: "urn:li:ugcPost:726350001928374",
          externalPostUrl: "https://www.linkedin.com/feed/update/urn:li:ugcPost:726350001928374/",
        },
      ],
    },
  ];

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
    const matchesPlatform =
      selectedPlatform === "all" || p.targets.some((t) => t.platform === selectedPlatform);
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HistoryIcon className="h-6 w-6 text-primary" />
            Publishing History & Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable audit record of all multi-platform publishing attempts and external identifiers.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/80">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground"
            >
              <option value="all">All Platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Post Table */}
      <Card className="border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-accent/40 text-muted-foreground font-semibold">
                <th className="p-3.5">Campaign Title</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5">Target Platforms</th>
                <th className="p-3.5">Overall Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-accent/20 transition-colors">
                  <td className="p-3.5 font-medium text-foreground">
                    <div className="max-w-xs truncate">{post.title}</div>
                    <span className="text-[10px] text-muted-foreground font-mono">{post.id}</span>
                  </td>
                  <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">
                    {post.date}
                  </td>
                  <td className="p-3.5">
                    <span className="capitalize text-muted-foreground">
                      {post.mode === "automatic" ? "Auto" : "Manual"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {post.targets.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase border ${
                              t.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {t.platform}
                          </span>
                          {t.externalPostUrl && (
                            <a
                              href={t.externalPostUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open live post"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5">
                    {post.status === "published" && (
                      <Badge variant="success" dot className="text-[11px]">
                        Published
                      </Badge>
                    )}
                    {post.status === "failed" && (
                      <Badge variant="error" dot className="text-[11px]">
                        Failed
                      </Badge>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectItem(post)}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Diagnostics</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Diagnostics Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Publishing Diagnostics & Audit
                </CardTitle>
                <button
                  onClick={() => setInspectItem(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="font-mono text-xs">
                {inspectItem.id} • {inspectItem.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {inspectItem.targets.map((t, idx) => (
                <div key={idx} className="rounded-lg border border-border/60 bg-accent/30 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize text-foreground">{t.platform}</span>
                    <Badge variant={t.status === "published" ? "success" : "error"} className="text-[10px]">
                      {t.status}
                    </Badge>
                  </div>
                  {t.externalPostId && (
                    <div className="font-mono text-[11px] text-muted-foreground truncate">
                      External ID: {t.externalPostId}
                    </div>
                  )}
                  {t.externalPostUrl && (
                    <div>
                      <a
                        href={t.externalPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        {t.externalPostUrl} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {t.errorMessage && (
                    <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2 text-rose-400 font-mono text-[11px]">
                      {t.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            <div className="border-t border-border/60 p-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setInspectItem(null)} className="text-xs">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
