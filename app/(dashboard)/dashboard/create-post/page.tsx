"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Sparkles,
  Send,
  Calendar,
  X,
  Check,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SocialPlatform } from "@/types";

interface PlatformOption {
  id: SocialPlatform;
  name: string;
  tag: string;
  note?: string;
}

const PLATFORMS: PlatformOption[] = [
  { id: "facebook", name: "Facebook", tag: "Meta Graph" },
  { id: "instagram", name: "Instagram", tag: "IG Business" },
  { id: "linkedin", name: "LinkedIn", tag: "UGC REST" },
  { id: "youtube", name: "YouTube", tag: "Data API v3", note: "Video only" },
];

interface PlatformContent {
  caption: string;
  hashtags: string;
}

export default function CreatePostPage() {
  const router = useRouter();

  // Media
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = React.useState<string | null>(null);
  const [isVideo, setIsVideo] = React.useState(false);

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<SocialPlatform[]>([
    "instagram",
    "facebook",
    "linkedin",
  ]);

  // Active preview/edit platform tab
  const [activeTab, setActiveTab] = React.useState<SocialPlatform>("instagram");

  // Per-platform tailored content
  const [platformContents, setPlatformContents] = React.useState<Record<SocialPlatform, PlatformContent>>({
    instagram: { caption: "", hashtags: "" },
    facebook: { caption: "", hashtags: "" },
    linkedin: { caption: "", hashtags: "" },
    youtube: { caption: "", hashtags: "" },
  });

  // AI & Context Prompt
  const [topicPrompt, setTopicPrompt] = React.useState("");
  const [language, setLanguage] = React.useState<"English" | "Tamil" | "Tanglish">("English");
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Scheduling
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [scheduledDateTime, setScheduledDateTime] = React.useState("");

  // Submitting
  const [isPublishing, setIsPublishing] = React.useState(false);

  // Toggle platform
  const togglePlatform = (id: SocialPlatform) => {
    setSelectedPlatforms((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      if (next.length > 0 && !next.includes(activeTab)) {
        setActiveTab(next[0]);
      }
      return next;
    });
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB limit");
      return;
    }

    setSelectedFile(file);
    const isVid = file.type.startsWith("video/");
    setIsVideo(isVid);

    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setMediaPreview(null);
    setIsVideo(false);
  };

  // Update current active platform's content
  const updateCurrentCaption = (newCaption: string) => {
    setPlatformContents((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        caption: newCaption,
      },
    }));
  };

  const updateCurrentHashtags = (newHashtags: string) => {
    setPlatformContents((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        hashtags: newHashtags,
      },
    }));
  };

  // AI Generation with Gemini
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    toast.loading("Analyzing media and generating trend-aware captions with Gemini AI...");

    try {
      let mediaBase64: string | undefined = undefined;
      let mediaMimeType: string | undefined = undefined;

      if (selectedFile && !isVideo) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(selectedFile);
        });
        mediaBase64 = await base64Promise;
        mediaMimeType = selectedFile.type;
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: topicPrompt || "Visual showcase and system campaign",
          language,
          tone: "Professional",
          targetPlatforms: selectedPlatforms,
          mediaBase64,
          mimeType: mediaMimeType,
        }),
      });

      toast.dismiss();

      if (!res.ok) {
        throw new Error("Failed to generate caption with Gemini");
      }

      const data = await res.json();
      const variants = data.data?.platforms || data.variants;

      if (variants) {
        const updated: Record<SocialPlatform, PlatformContent> = { ...platformContents };

        for (const p of ["instagram", "facebook", "linkedin", "youtube"] as SocialPlatform[]) {
          if (variants[p]) {
            const tags = Array.isArray(variants[p].hashtags)
              ? variants[p].hashtags.join(" ")
              : variants[p].hashtags || "";
            updated[p] = {
              caption: variants[p].caption || variants[p].title || "",
              hashtags: tags,
            };
          }
        }

        setPlatformContents(updated);
        toast.success("Tailored captions and trending hashtags generated for each platform.");
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to generate AI content");
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit Post
  const handleSubmit = async (isDraft = false) => {
    const currentContent = platformContents[activeTab];
    if (!currentContent?.caption.trim() && !isDraft) {
      toast.error("Please provide a caption or generate one with Gemini AI");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    if (isScheduled && !scheduledDateTime && !isDraft) {
      toast.error("Please select a scheduled date and time");
      return;
    }

    // Validate YouTube video requirements
    if (selectedPlatforms.includes("youtube") && (!selectedFile || !selectedFile.type.startsWith("video/"))) {
      toast.error("YouTube requires a video file (.mp4, .mov, .webm). Please attach a video asset to publish to YouTube, or uncheck YouTube.");
      return;
    }

    setIsPublishing(true);
    try {
      // 1. Resolve current session user ID
      let userId = "00000000-0000-0000-0000-000000000001";
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.user?.id) userId = sessionData.user.id;
        }
      } catch {}

      // 2. Upload media file to storage if present
      let mediaAssetId: string | undefined = undefined;
      if (selectedFile) {
        toast.loading("Uploading media asset...");
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);
          formData.append("userId", userId);
          const upRes = await fetch("/api/media/upload", {
            method: "POST",
            body: formData,
          });
          if (upRes.ok) {
            const upData = await upRes.json();
            mediaAssetId = upData.asset?.id;
          }
        } catch (upErr) {
          console.warn("Media upload error:", upErr);
        } finally {
          toast.dismiss();
        }
      }

      const payload = {
        userId,
        mediaAssetId,
        title: topicPrompt || "SocialSync Post",
        publishingMode: isDraft ? "manual_approval" : "automatic",
        scheduledFor: isScheduled && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
        targetPlatforms: selectedPlatforms,
        variants: selectedPlatforms.map((p) => {
          const content = platformContents[p] || currentContent;
          return {
            platform: p,
            caption: content?.caption || currentContent?.caption || "",
            hashtags: (content?.hashtags || currentContent?.hashtags || "").split(/\s+/).filter(Boolean),
            language,
            tone: "Professional",
            isApproved: true,
          };
        }),
      };

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit post");
      }

      const summary = resData.summary;
      if (summary) {
        if (summary.failureCount > 0) {
          const failedNotes = summary.results
            .filter((r: any) => !r.success)
            .map((r: any) => `${r.platform.toUpperCase()}: ${r.errorMessage || 'Failed'}`)
            .join(" | ");
          toast.warning(`Published with provider notices: ${failedNotes}`);
        } else {
          toast.success("Post successfully published to all selected platforms!");
        }
      } else if (isDraft) {
        toast.success("Draft saved successfully");
      } else if (isScheduled) {
        toast.success("Post scheduled successfully");
        router.push("/dashboard/calendar");
      } else {
        toast.success("Post submitted to publishing pipeline");
        router.push("/dashboard/history");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process post");
    } finally {
      setIsPublishing(false);
    }
  };

  const currentContent = platformContents[activeTab] || { caption: "", hashtags: "" };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Publish Now
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direct multi-platform media publishing and automated Gemini caption generation.
          </p>
        </div>
      </div>

      {/* 2-Column Clean Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Media & Platform Selection */}
        <div className="space-y-6">
          {/* Media Upload Box */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              1. Media Content
            </h2>

            {mediaPreview ? (
              <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
                {isVideo ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full max-h-64 object-contain mx-auto"
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Media preview"
                    className="w-full max-h-64 object-contain mx-auto"
                  />
                )}
                <div className="p-3 bg-card border-t border-border flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                    {selectedFile?.name}
                  </span>
                  <button
                    onClick={removeFile}
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-border hover:border-foreground/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center space-y-2 bg-muted/10 hover:bg-muted/20">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Click or drag image or video here
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PNG, JPG, or MP4 up to 50MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Platforms Selection */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              2. Target Platforms
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-foreground bg-accent/40 text-foreground font-semibold"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{platform.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {platform.tag}
                      </div>
                    </div>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border ${
                        isSelected
                          ? "bg-black dark:bg-white text-white dark:text-black border-transparent"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule (Optional) */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight">
                  3. Schedule for Later (Optional)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Publish automatically at a designated time.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary cursor-pointer"
              />
            </div>

            {isScheduled && (
              <div className="pt-2">
                <Input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI & Text Content */}
        <div className="space-y-6">
          {/* AI Generator Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Gemini AI Caption Engine
              </h2>

              <div className="flex items-center gap-1 text-xs">
                {(["English", "Tamil", "Tanglish"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      language === lang
                        ? "bg-foreground text-background font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Topic or context (e.g. New major launch or trending tech news)..."
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="w-full text-xs font-medium gap-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGenerating ? "Analyzing Media & Trends with Gemini..." : "Generate with Gemini AI"}
              </Button>
            </div>
          </div>

          {/* Per-Platform Caption & Hashtags Editor */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            {/* Platform Selector Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {selectedPlatforms.map((p) => {
                  const isActive = activeTab === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActiveTab(p)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                        isActive
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                {currentContent.caption.length} chars
              </span>
            </div>

            {/* Caption Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Caption for <span className="capitalize font-semibold">{activeTab}</span></span>
              </label>
              <Textarea
                rows={6}
                placeholder={`Write tailored caption for ${activeTab} or generate with Gemini AI above...`}
                value={currentContent.caption}
                onChange={(e) => updateCurrentCaption(e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Hashtags Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-foreground">
                Trending Hashtags for <span className="capitalize font-semibold">{activeTab}</span>
              </label>
              <Input
                placeholder="#trends #ai #innovation #viral"
                value={currentContent.hashtags}
                onChange={(e) => updateCurrentHashtags(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isPublishing}
              className="flex-1 text-xs font-semibold gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </Button>

            <Button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isPublishing}
              className="flex-1 text-xs font-semibold gap-1.5 bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black shadow-sm"
            >
              {isScheduled ? (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  {isPublishing ? "Scheduling..." : "Schedule Post"}
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {isPublishing ? "Publishing..." : "Publish Now"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
