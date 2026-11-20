"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Send,
  Sparkles,
  AlertCircle,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform } from "@/types";

interface PendingApprovalItem {
  id: string;
  title: string;
  createdAt: string;
  variants: Array<{
    id: string;
    platform: SocialPlatform;
    caption: string;
    hashtags: string[];
    isApproved: boolean;
  }>;
}

export default function ApprovalCenterPage() {
  const [items, setItems] = React.useState<PendingApprovalItem[]>([
    {
      id: "post-appr-1",
      title: "SocialSync AI Multi-Platform Architecture Overview",
      createdAt: "Today at 01:15 PM",
      variants: [
        {
          id: "var-1",
          platform: "linkedin",
          caption:
            "Elevating social media automation with intelligent multi-channel orchestration.\n\nWe engineered SocialSync AI to solve fragmented multi-platform distribution. Powered by Google Gemini multimodal AI and official OAuth integrations, digital teams save 10+ hours weekly.\n\nKey architectural capabilities:\n• Zero-Password AES-256-GCM token encryption\n• Real-time Gemini poster text and visual extraction\n• Fully automatic and manual review pipelines\n\nHow does your team manage cross-platform distribution today?",
          hashtags: ["#SocialSyncAI", "#SoftwareEngineering", "#Architecture", "#Productivity"],
          isApproved: false,
        },
        {
          id: "var-2",
          platform: "instagram",
          caption:
            "System Architecture Overview: SocialSync AI.\n\nA unified command center for autonomous multi-channel distribution. One media upload produces four platform-compliant presentations with full cryptographic token security.\n\nSave this post for architectural reference. Inquiries are welcomed in the comments below.",
          hashtags: ["#SoftwareEngineering", "#Architecture", "#Automation", "#DesignSystems"],
          isApproved: false,
        },
      ],
    },
    {
      id: "post-appr-2",
      title: "Engineering Milestone & System Demonstration",
      createdAt: "Yesterday at 05:40 PM",
      variants: [
        {
          id: "var-3",
          platform: "facebook",
          caption:
            "System Update Announcement:\n\nOur latest platform release is live. Users can now orchestrate and publish directly to connected Facebook Pages and Instagram Business accounts with guaranteed API compliance and audit tracking.",
          hashtags: ["#SoftwareUpdate", "#Engineering", "#Automation"],
          isApproved: false,
        },
      ],
    },
  ]);

  const [activePlatformTab, setActivePlatformTab] = React.useState<Record<string, SocialPlatform>>({
    "post-appr-1": "linkedin",
    "post-appr-2": "facebook",
  });

  const [editingCaptions, setEditingCaptions] = React.useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  const handleEditChange = (variantId: string, text: string) => {
    setEditingCaptions((prev) => ({ ...prev, [variantId]: text }));
  };

  const handleApprove = async (postId: string, publishNow: boolean) => {
    setIsProcessing(postId);
    toast.loading(publishNow ? "Approving and executing live broadcast..." : "Approving post...");

    try {
      const res = await fetch(`/api/posts/${postId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "00000000-0000-0000-0000-000000000001",
          action: "approved",
          publishImmediately: publishNow,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Approval failed");

      toast.dismiss();
      toast.success(publishNow ? "Post approved and published live!" : "Post approved for queue.");
      setItems((prev) => prev.filter((item) => item.id !== postId));
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Approval action failed");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (postId: string) => {
    if (!confirm("Are you sure you want to reject and cancel this post?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "00000000-0000-0000-0000-000000000001",
          action: "rejected",
        }),
      });

      if (!res.ok) throw new Error("Rejection failed");

      setItems((prev) => prev.filter((item) => item.id !== postId));
      toast.info("Post rejected and archived.");
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-amber-500" />
            Approval Center (Mode B)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review, edit, and authorize generated social media content before it gets published.
          </p>
        </div>

        <Badge variant="warning" dot className="px-3 py-1 text-xs">
          {items.length} Pending Approval
        </Badge>
      </div>

      {/* Approvals List */}
      {items.length === 0 ? (
        <Card className="border-dashed border-border/80 flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">All Clear!</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            There are no campaigns waiting in the approval queue. New posts created in Manual Approval mode will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {items.map((post) => {
            const currentTab = activePlatformTab[post.id] || post.variants[0].platform;
            const currentVariant =
              post.variants.find((v) => v.platform === currentTab) || post.variants[0];
            const captionValue =
              editingCaptions[currentVariant.id] !== undefined
                ? editingCaptions[currentVariant.id]
                : currentVariant.caption;

            return (
              <Card key={post.id} className="border-border/80 overflow-hidden shadow-sm">
                <CardHeader className="bg-accent/20 border-b border-border/60 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-0.5">
                      <CardTitle className="text-base">{post.title}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        Created {post.createdAt} • ID: {post.id}
                      </CardDescription>
                    </div>

                    {/* Platform Selector Tabs */}
                    <div className="flex gap-1.5">
                      {post.variants.map((v) => (
                        <button
                          key={v.platform}
                          type="button"
                          onClick={() =>
                            setActivePlatformTab((prev) => ({
                              ...prev,
                              [post.id]: v.platform,
                            }))
                          }
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                            currentTab === v.platform
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-card text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {v.platform}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground capitalize">
                        {currentTab} Generated Copy:
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {captionValue.length} characters
                      </span>
                    </div>
                    <Textarea
                      rows={6}
                      value={captionValue}
                      onChange={(e) => handleEditChange(currentVariant.id, e.target.value)}
                      className="text-xs leading-relaxed font-sans"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {currentVariant.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded bg-accent text-primary px-2 py-0.5 text-xs font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border/60 bg-accent/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReject(post.id)}
                    className="w-full sm:w-auto text-xs gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject Post</span>
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(post.id, false)}
                      disabled={isProcessing === post.id}
                      className="w-full sm:w-auto text-xs gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Approve for Queue</span>
                    </Button>

                    <Button
                      variant="stitch"
                      size="sm"
                      onClick={() => handleApprove(post.id, true)}
                      disabled={isProcessing === post.id}
                      className="w-full sm:w-auto text-xs gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Approve & Publish Now</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
