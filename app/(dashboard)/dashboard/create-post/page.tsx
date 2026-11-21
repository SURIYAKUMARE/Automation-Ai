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
import { prepareMediaPreview } from "@/lib/ai/media-preview";
import { SocialPlatform, SupportedTone } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";

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
  title?: string;
  caption: string;
  hashtags: string;
  keywords?: string[];
  alternatives?: string[];
  rationale?: string;
}

export default function CreatePostPage() {
  const router = useRouter();

  // Media
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = React.useState<string | null>(null);
  const [isVideo, setIsVideo] = React.useState(false);
  const [draftId, setDraftId] = React.useState<string>();
  const [savedAssetId, setSavedAssetId] = React.useState<string>();

  // Platform selection
  const [connectedPlatforms, setConnectedPlatforms] = React.useState<SocialPlatform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<SocialPlatform[]>([]);

  const [activeTab, setActiveTab] = React.useState<SocialPlatform>("instagram");

  // Fetch real connected accounts on load
  React.useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          const active = (data.accounts || [])
            .filter((a: any) => a.status === "active")
            .map((a: any) => a.platform as SocialPlatform);
          setConnectedPlatforms([...new Set<SocialPlatform>(active)]);
          if (active.length > 0 && !new URLSearchParams(window.location.search).has("draft")) {
            setSelectedPlatforms([...new Set<SocialPlatform>(active)]);
            setActiveTab(active[0]);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch connected accounts for publish validation:", e);
      }
    }
    loadAccounts();
  }, []);


  // Per-platform tailored content
  const [platformContents, setPlatformContents] = React.useState<Record<SocialPlatform, PlatformContent>>({
    instagram: { caption: "", hashtags: "" },
    facebook: { caption: "", hashtags: "" },
    linkedin: { caption: "", hashtags: "" },
    youtube: { title: "", caption: "", hashtags: "" },
  });

  // AI & Context Prompt
  const [topicPrompt, setTopicPrompt] = React.useState("");
  const [language, setLanguage] = React.useState<"English" | "Tamil" | "Tanglish">("English");
  const [tone, setTone] = React.useState<SupportedTone>("Professional");
  const [summary, setSummary] = React.useState("");
  const [review, setReview] = React.useState(false);
  const requestId = React.useRef<string | undefined>(undefined);
  const uploadedAsset = React.useRef<{ file: File; id: string } | undefined>(undefined);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Scheduling
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [weeklyOccurrences, setWeeklyOccurrences] = React.useState(1);
  const [scheduledDateTime, setScheduledDateTime] = React.useState("");

  // Submitting
  const [isPublishing, setIsPublishing] = React.useState(false);

  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("draft");
    if (!id) return;
    const controller = new AbortController();
    fetch("/api/posts/" + encodeURIComponent(id), { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || data.post.status !== "draft") throw new Error("Draft unavailable");
      const post = data.post;
      setDraftId(post.id);
      setTopicPrompt(post.raw_prompt || post.title || "");
      setSelectedPlatforms(post.target_platforms);
      setActiveTab(post.target_platforms[0] || "instagram");
      setSavedAssetId(post.media_asset_id || undefined);
      setMediaPreview(data.previewUrl || null);
      setIsVideo(data.mediaType === "video");
      setPlatformContents((current) => {
        const updated = { ...current };
        for (const variant of post.post_variants) {
          const platform = variant.platform as SocialPlatform;
          updated[platform] = { caption: variant.caption, title: variant.title, hashtags: (variant.hashtags || []).join(" "), keywords: variant.keywords };
        }
        return updated;
      });
    }).catch(() => { if (!controller.signal.aborted) toast.error("Could not load the saved draft."); });
    return () => controller.abort();
  }, []);

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
  React.useEffect(() => () => { if (mediaPreview?.startsWith("blob:")) URL.revokeObjectURL(mediaPreview); }, [mediaPreview]);

  const chooseFile = (file?: File) => {
    if (!file) return;

    if (file.size > (file.type.startsWith("video/") ? 100 : 15) * 1024 * 1024) {
      toast.error("File exceeds the upload size limit");
      return;
    }

    setSavedAssetId(undefined);
    setSelectedFile(file);
    const isVid = file.type.startsWith("video/");
    setIsVideo(isVid);

    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);
  };

  const removeFile = () => {
    setSavedAssetId(undefined);
    setSelectedFile(null);
    setMediaPreview(null);
    setIsVideo(false);
  };

  // Update current active platform's content
  const updateCurrentTitle = (newTitle: string) => {
    setPlatformContents((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        title: newTitle,
      },
    }));
  };

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

  const handleGenerateAI = async () => {
    if (!selectedPlatforms.length || (!selectedFile && !topicPrompt.trim())) {
      toast.error("Select a platform and add media or text context.");
      return;
    }
    setIsGenerating(true);
    const notice = toast.loading("Generating platform captions");
    try {
      const media = selectedFile ? await prepareMediaPreview(selectedFile) : {};
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...media, prompt: topicPrompt, language, tone, targetPlatforms: selectedPlatforms, alternatives: true }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not generate captions");
      setSummary(result.data.summary);
      setPlatformContents((previous) => {
        const updated = { ...previous };
        for (const p of selectedPlatforms) {
          const variant = result.variants[p];
          if (variant) updated[p] = { ...variant, hashtags: variant.hashtags.join(" ") };
        }
        return updated;
      });
      toast.success("Captions ready to review", { id: notice });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate captions", { id: notice });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (isDraft = false) => {
    if (!selectedPlatforms.length) {
      toast.error("Select at least one platform.");
      return;
    }
    const ytVideoTitle = platformContents.youtube.title?.trim() || topicPrompt.trim();
    if (!isDraft) {
      const missing = selectedPlatforms.find((p) => !platformContents[p].caption.trim());
      if (missing) {
        setActiveTab(missing);
        toast.error("Add a caption for " + missing + ".");
        return;
      }
      if (selectedPlatforms.some((p) => !connectedPlatforms.includes(p))) {
        toast.error("Connect an account for each selected platform.");
        return;
      }
      if (isScheduled && (!scheduledDateTime || new Date(scheduledDateTime).getTime() <= Date.now())) {
        toast.error("Choose a future date and time.");
        return;
      }
      if (selectedPlatforms.includes("youtube") && (!isVideo || !ytVideoTitle)) {
        toast.error("YouTube requires a video and a title.");
        return;
      }
    }

    requestId.current ??= draftId || crypto.randomUUID();
    setIsPublishing(true);
    try {
      let mediaAssetId = savedAssetId;
      if (selectedFile) {
        if (uploadedAsset.current?.file !== selectedFile) {
          setUploadProgress(0);
          const form = new FormData();
          form.append("file", selectedFile);
          const id = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/media/upload");
            xhr.responseType = "json";
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) setUploadProgress(Math.round(event.loaded / event.total * 100));
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.asset?.id) resolve(xhr.response.asset.id);
              else reject(new Error(xhr.response?.error || "Media upload failed"));
            };
            xhr.onerror = () => reject(new Error("Could not reach the upload service"));
            xhr.send(form);
          });
          uploadedAsset.current = { file: selectedFile, id };
        }
        mediaAssetId = uploadedAsset.current?.id;
      }

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          mediaAssetId, draft: isDraft, replaceDraft: !!draftId, title: ytVideoTitle || topicPrompt.trim() || "Untitled post",
          rawPrompt: topicPrompt,
          publishingMode: isDraft || review ? "manual_approval" : "automatic",
          scheduledFor: !isDraft && isScheduled ? new Date(scheduledDateTime).toISOString() : undefined,
          recurrences: isScheduled && !isDraft && !review ? Array.from({ length: weeklyOccurrences - 1 }, (_, index) => {
            const date = new Date(scheduledDateTime);
            date.setDate(date.getDate() + 7 * (index + 1));
            return date.toISOString();
          }) : [],
          targetPlatforms: selectedPlatforms,
          variants: selectedPlatforms.map((platform) => {
            const content = platformContents[platform];
            return { platform, title: platform === "youtube" ? ytVideoTitle : content.title,
              caption: content.caption, hashtags: content.hashtags.split(/\s+/).filter(Boolean),
              keywords: content.keywords?.map((keyword) => keyword.trim()).filter(Boolean), language, tone };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status < 500) requestId.current = undefined;
        throw new Error(data.error || "Could not save this post");
      }
      requestId.current = undefined;
      toast.success(isDraft ? "Draft saved" : review ? "Sent for approval" : isScheduled ? "Post scheduled" : "Post queued for publishing");
      router.push(review && !isDraft ? "/dashboard/approvals" : isScheduled && !isDraft ? "/dashboard/calendar" : "/dashboard/history");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the post");
    } finally {
      setUploadProgress(null);
      setIsPublishing(false);
    }
  };

  const currentContent = platformContents[activeTab] || { caption: "", hashtags: "" };

  return (
    <div className="space-y-6">
      {uploadProgress !== null && <label className="block text-sm">Uploading media ({uploadProgress}%)
        <progress className="block w-full" max={100} value={uploadProgress} />
      </label>}
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
              <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} className="border-2 border-dashed border-border hover:border-foreground/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center space-y-2 bg-muted/10 hover:bg-muted/20">
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
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                  className="sr-only"
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
                const isConnected = connectedPlatforms.includes(platform.id);
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
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card/90 p-1.5 border border-border/60 shrink-0 shadow-sm">
                        <PlatformIcon platform={platform.id} className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          <span>{platform.name}</span>
                          {isConnected ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Connected & Active" />
                          ) : (
                            <span className="text-[10px] font-normal text-amber-500 font-mono">(Offline)</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {platform.tag}
                        </div>
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

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={review} onChange={(event) => setReview(event.target.checked)} />
              Send to Approval Center before publishing
            </label>
            {isScheduled && !review && <label className="block text-xs">Weekly occurrences
              <select value={weeklyOccurrences} className="ml-2 rounded border bg-card p-1" onChange={(event) => setWeeklyOccurrences(Number(event.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => <option key={number} value={number}>{number === 1 ? "Once" : number + " weeks"}</option>)}
              </select>
            </label>}
            {isScheduled && (
              <div className="pt-2">
                <Input
                  aria-label="Schedule in your local timezone"
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
              <label className="block text-xs">Tone
                <select value={tone} onChange={(event) => setTone(event.target.value as SupportedTone)} className="ml-2 rounded border bg-background p-1">
                  {["Professional", "Friendly", "Funny", "Motivational", "Educational", "Marketing", "Viral-style"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
              <Button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="w-full text-xs font-medium gap-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGenerating ? "Analyzing content…" : "Generate with Gemini AI"}
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                        isActive
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <PlatformIcon platform={p} className="h-3.5 w-3.5" />
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                {currentContent.caption.length} chars
              </span>
            </div>

            {/* YouTube Video Title Section */}
            {activeTab === "youtube" && (
              <div className="space-y-1.5 p-3 rounded-xl border border-red-500/30 bg-red-500/5 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <PlatformIcon platform="youtube" className="h-4 w-4" />
                    <span>YouTube Video Title</span>
                    <span className="text-[10px] text-red-500 font-mono font-medium">*Required by YouTube</span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const base =
                          topicPrompt ||
                          currentContent.caption.split("\n")[0] ||
                          "Next-Gen Multi-Platform Automation";
                        const clean = base.replace(/[#*]/g, "").trim().substring(0, 90);
                        const autoYtTitle = clean.length > 5 ? clean : "Next-Gen AI Automation Showcase";
                        updateCurrentTitle(autoYtTitle);
                        toast.success("Generated YouTube Video Title!");
                      }}
                      className="text-[11px] font-medium text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                      title="Generate a catchy YouTube video title automatically"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-Generate Title</span>
                    </button>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {(currentContent.title || "").length}/100
                    </span>
                  </div>
                </div>
                <Input
                  maxLength={100}
                  placeholder="Enter video title (e.g. Next-Gen AI Automation with SocialFlow)..."
                  value={currentContent.title || ""}
                  onChange={(e) => updateCurrentTitle(e.target.value)}
                  className="text-xs font-medium bg-background border-border"
                />
              </div>
            )}

            {/* Caption Textarea */}
            <div className="space-y-1.5">
              {currentContent.rationale && <p className="text-xs text-muted-foreground">{currentContent.rationale}</p>}
              {currentContent.alternatives?.map((caption, index) => (
                <details key={caption} className="rounded border p-2 text-xs">
                  <summary className="cursor-pointer">Caption option {index + 2}</summary>
                  <p className="whitespace-pre-wrap my-2">{caption}</p>
                  <Button size="sm" type="button" variant="outline" onClick={() => updateCurrentCaption(caption)}>Use this caption</Button>
                </details>
              ))}
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>
                  {activeTab === "youtube" ? "Video Description for" : "Caption for"}{" "}
                  <span className="capitalize font-semibold">{activeTab}</span>
                </span>
              </label>
              <Textarea
                rows={6}
                placeholder={
                  activeTab === "youtube"
                    ? "Write YouTube video description..."
                    : `Write tailored caption for ${activeTab} or generate with Gemini AI above...`
                }
                value={currentContent.caption}
                onChange={(e) => updateCurrentCaption(e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Hashtags Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-foreground">
                {activeTab === "youtube" ? "Video Tags for" : "Trending Hashtags for"}{" "}
                <span className="capitalize font-semibold">{activeTab}</span>
              </label>
              {activeTab === "youtube" && <label className="block text-xs font-medium">
                YouTube search tags
                <Input value={currentContent.keywords?.join(",") || ""} placeholder="Separate tags with commas"
                  onChange={(event) => setPlatformContents((previous) => ({
                    ...previous, youtube: { ...previous.youtube, keywords: event.target.value.split(",") },
                  }))} />
              </label>}
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
