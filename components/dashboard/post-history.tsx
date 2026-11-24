"use client";

import * as React from "react";
import Link from "next/link";
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
  X,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform, PostStatus } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";
import { cn } from "@/lib/utils";

interface PostHistoryEntry {
  id: string;
  title: string;
  date: string;
  status: PostStatus;
  mode: "automatic" | "manual_approval";
  targets: Array<{
    id: string;
    platform: SocialPlatform;
    status: PostStatus;
    externalPostUrl?: string;
    externalPostId?: string;
    errorMessage?: string;
  }>;
}

type View = "history" | "scheduled" | "queue" | "published" | "draft";
const headings: Record<View, string> = {
  history: "Publishing History & Audit",
  scheduled: "Scheduled Campaigns",
  queue: "Active Publishing Queue",
  published: "Published Live Posts",
  draft: "Saved Campaign Drafts",
};

export default function PostHistory({
  view = "history",
  search = "",
  postId,
  status = "all",
}: {
  view?: View;
  search?: string;
  postId?: string;
  status?: string;
}) {
  const [searchTerm, setSearchTerm] = React.useState(search);
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState(status);
  const [inspectItem, setInspectItem] = React.useState<PostHistoryEntry | null>(null);
  const [posts, setPosts] = React.useState<PostHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [pending, setPending] = React.useState("");

  React.useEffect(() => {
    async function loadHistory() {
      try {
        const params = new URLSearchParams({ view });
        if (postId) params.set("post", postId);
        if (selectedStatus !== "all") params.set("status", selectedStatus);
        const res = await fetch("/api/posts?" + params);
        if (!res.ok) throw new Error("Could not load posts.");
        const data = await res.json();
        const realPosts = data.posts || [];
        setLoadFailed(false);
        setPosts(
          realPosts.map((p: any) => ({
            id: p.id,
            title: p.title || "Untitled Social Campaign",
            date: p.published_at || p.scheduled_for || p.created_at
              ? new Date(p.published_at || p.scheduled_for || p.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
              : "Recently",
            status: p.status,
            mode: p.publishing_mode || "automatic",
            targets: (p.post_targets || []).map((t: any) => ({
              id: t.id,
              platform: t.platform,
              status: t.status,
              externalPostId: t.external_post_id,
              externalPostUrl: t.external_post_url,
              errorMessage: t.error_message,
            })),
          }))
        );
      } catch {
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
    const refresh = window.setInterval(loadHistory, 8000);
    return () => window.clearInterval(refresh);
  }, [view, postId, selectedStatus]);

  async function queuePost(post: PostHistoryEntry) {
    setPending(post.id);
    const notice = toast.loading("Queueing post for publishing...");
    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, status: data.post.status } : item)));
      toast.success("Post queued for destinations!", { id: notice });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not queue the post", { id: notice });
    } finally {
      setPending("");
    }
  }

  async function retryTarget(id: string) {
    setPending(id);
    const notice = toast.loading("Dispatching background retry...");
    try {
      const response = await fetch("/api/publishing/targets/" + id + "/retry", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Target retry dispatched successfully!", { id: notice });
      setInspectItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not retry the destination", { id: notice });
    } finally {
      setPending("");
    }
  }

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
    const matchesPlatform = selectedPlatform === "all" || p.targets.some((t) => t.platform === selectedPlatform);
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>{headings[view]}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Live Audit Log
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor delivery logs, external URLs, and real-time execution states across every network.
          </p>
        </div>

        <Link href="/dashboard/create-post">
          <Button variant="stitch" size="sm" className="h-9 text-xs rounded-xl shadow-md shadow-indigo-500/20">
            Create Post
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border-border/70 bg-card p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts by headline or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              aria-label="Platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Channels</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
            </select>

            {view === "history" && (
              <select
                aria-label="Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="failed">Failed</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
              </select>
            )}
          </div>
        </div>
      </Card>

      {loadFailed && (
        <div role="alert" className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
          Could not load post history records. Reconnecting automatically...
        </div>
      )}

      {/* Posts Table */}
      <Card className="rounded-2xl border-border/70 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Post Headline</th>
                <th className="py-3 px-3">Date / Schedule</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Destinations</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground text-xs">
                    {isLoading ? "Loading post history records..." : "No post records match your active search filters."}
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => {
                  const isPublished = post.status === "published";
                  const isFailed = post.status.includes("fail");
                  const isDraft = post.status === "draft";

                  return (
                    <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground max-w-xs">
                        <div className="truncate font-semibold">{post.title}</div>
                        <span className="text-[10px] text-muted-foreground font-mono truncate block">{post.id}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                        {post.date}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize text-[11px] text-muted-foreground font-mono">
                          {post.mode === "automatic" ? "Auto" : "Approval"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {post.targets.map((t, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono uppercase border",
                                  t.status === "published"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                )}
                              >
                                <PlatformIcon platform={t.platform} className="h-3 w-3" />
                                <span>{t.platform}</span>
                              </span>
                              {t.externalPostUrl && (
                                <a
                                  href={t.externalPostUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open live post"
                                  className="text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {(() => {
                          const isPartial = post.status === "failed" && post.targets.some((target) => target.status === "published");
                          return (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize border inline-flex items-center gap-1",
                                isPublished && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                                isPartial && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                                isFailed && !isPartial && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                                isDraft && "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
                                !isPublished && !isFailed && !isDraft && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0",
                                  isPublished ? "bg-emerald-500" : isPartial ? "bg-amber-500" : isFailed ? "bg-rose-500" : isDraft ? "bg-slate-500" : "bg-indigo-500"
                                )}
                              />
                              {isPartial ? "Partial Success" : post.status.replaceAll("_", " ")}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDraft && (
                            <Link
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mr-1"
                              href={`/dashboard/create-post?draft=${post.id}`}
                            >
                              Edit draft
                            </Link>
                          )}
                          {((isFailed &&
                            post.targets.some(
                              (target) => target.status === "failed" || target.status === "reauthorization_required"
                            )) ||
                            post.status === "approved") && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={Boolean(pending)}
                              onClick={() => void queuePost(post)}
                              className="h-7 text-xs rounded-lg"
                            >
                              <RotateCw className={cn("h-3 w-3 mr-1", pending === post.id && "animate-spin")} />
                              {isFailed ? "Retry" : "Queue"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectItem(post)}
                            className="h-7 px-2 text-xs gap-1 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Audit</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Diagnostics & Target Retry Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <Card className="w-full max-w-lg border-border/80 bg-card shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Publishing Telemetry &amp; Diagnostics
                </CardTitle>
                <CardDescription className="font-mono text-[11px] text-muted-foreground pt-0.5 truncate max-w-xs">
                  {inspectItem.title}
                </CardDescription>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
              {inspectItem.targets.map((t) => (
                <div key={t.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold capitalize text-foreground">
                      <PlatformIcon platform={t.platform} className="h-4 w-4" />
                      <span>{t.platform}</span>
                    </div>
                    <Badge
                      variant={t.status === "published" ? "success" : "error"}
                      className={cn(
                        "text-[10px] rounded-md px-2 py-0.5 capitalize",
                        t.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}
                    >
                      {t.status.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  {t.externalPostId && (
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      External Platform ID: {t.externalPostId}
                    </div>
                  )}

                  {t.externalPostUrl && (
                    <div>
                      <a
                        href={t.externalPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span>View Live Post</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {t.errorMessage && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-rose-500 dark:text-rose-400 font-mono text-[10px] leading-relaxed">
                      {t.errorMessage}
                    </div>
                  )}

                  {["failed", "processing"].includes(inspectItem.status) &&
                    !t.externalPostId &&
                    ["failed", "reauthorization_required"].includes(t.status) && (
                      <Button
                        size="sm"
                        type="button"
                        variant="stitch"
                        disabled={Boolean(pending)}
                        onClick={() => void retryTarget(t.id)}
                        className="h-8 text-xs font-semibold rounded-xl w-full gap-1.5 shadow-xs"
                      >
                        <RefreshCw className={cn("h-3 w-3", pending === t.id && "animate-spin")} />
                        <span>Retry this destination now</span>
                      </Button>
                    )}
                </div>
              ))}
            </CardContent>
            <div className="border-t border-border/60 p-3 flex justify-end bg-muted/20">
              <Button variant="outline" size="sm" onClick={() => setInspectItem(null)} className="text-xs rounded-xl h-8">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
