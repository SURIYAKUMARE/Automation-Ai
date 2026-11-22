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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform, PostStatus } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";

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
const headings: Record<View, string> = { history: "Publishing history", scheduled: "Scheduled posts", queue: "Post queue", published: "Published posts", draft: "Drafts" };

export default function PostHistory({ view = "history", search = "", postId, status = "all" }: { view?: View; search?: string; postId?: string; status?: string }) {
  const [searchTerm, setSearchTerm] = React.useState(search);
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState(status);
  const [inspectItem, setInspectItem] = React.useState<PostHistoryEntry | null>(null);
  const [posts, setPosts] = React.useState<PostHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);

  React.useEffect(() => {
    async function loadHistory() {
      try {
        const params = new URLSearchParams({ view });
        if (postId) params.set("post", postId);
        if (selectedStatus !== "all") params.set("status", selectedStatus);
        const res = await fetch("/api/posts?" + params);
        if (!res.ok) throw new Error("Could not load posts.");
        if (res.ok) {
          const data = await res.json();
          const realPosts = data.posts || [];
          setLoadFailed(false);
          setPosts(
            realPosts.map((p: any) => ({
              id: p.id,
              title: p.title || "Untitled Campaign",
              date: p.published_at || p.scheduled_for || p.created_at ? new Date(p.published_at || p.scheduled_for || p.created_at).toLocaleString() : "Recently",
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
        }
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

  const [pending, setPending] = React.useState("");
  async function queuePost(post: PostHistoryEntry) {
    setPending(post.id);
    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, status: data.post.status } : item));
      toast.success("Post queued");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not queue the post");
    } finally {
      setPending("");
    }
  }

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
    const matchesPlatform =
      selectedPlatform === "all" || p.targets.some((t) => t.platform === selectedPlatform);
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  async function retryTarget(id: string) {
    setPending(id);
    try {
      const response = await fetch("/api/publishing/targets/" + id + "/retry", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Destination retry queued");
      setInspectItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not retry the destination");
    } finally {
      setPending("");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {headings[view]}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track drafts, queued posts and publishing outcomes for each destination.
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
            <select aria-label="Platform"
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

            {view === "history" && <select aria-label="Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
              <option value="scheduled">Scheduled</option>
            </select>}
          </div>
        </CardContent>
      </Card>

      {loadFailed && <p role="alert" className="text-sm text-destructive">Could not load posts. The workspace will retry automatically.</p>}
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
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                    {isLoading ? "Loading posts..." : "No posts match this view."}
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                <tr id={"post-" + post.id} key={post.id} className="hover:bg-accent/20 transition-colors">
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
                    <div className="flex flex-wrap gap-1.5">
                      {post.targets.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase border ${
                              t.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
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
                    <Badge variant={post.status === "published" ? "success" : post.status === "failed" ? "error" : "outline"} dot className="text-[11px] capitalize">
                      {post.status === "failed" && post.targets.some((target) => target.status === "published")
                        ? "Partial failure" : post.status.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    {post.status === "draft" && <Link className="mr-2 text-sm underline" href={"/dashboard/create-post?draft=" + post.id}>Edit draft</Link>}
                    {((post.status === "failed" && post.targets.some((target) => target.status === "failed" || target.status === "reauthorization_required")) || post.status === "approved") &&
                      <Button variant="outline" size="sm" disabled={Boolean(pending)} onClick={() => void queuePost(post)}>
                        {post.status === "failed" ? "Retry failed targets" : "Queue now"}
                      </Button>}
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
              )))}
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
              {inspectItem.targets.map((t) => (
                <div key={t.id} className="rounded-lg border border-border/60 bg-accent/30 p-3 space-y-1.5">
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
                  {["failed", "processing"].includes(inspectItem.status) && !t.externalPostId && ["failed", "reauthorization_required"].includes(t.status) &&
                    <Button size="sm" type="button" variant="outline" disabled={Boolean(pending)} onClick={() => void retryTarget(t.id)}>
                      Retry this destination
                    </Button>}
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
