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
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { prepareMediaPreview } from "@/lib/ai/media-preview";
import { convertImageToVideo } from "@/lib/media/image-to-video";
import { UploadPublishingSettings } from "@/components/dashboard/upload-publishing-settings";
import { SocialPlatform, SupportedTone } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";
import { SocialMediaLivePreview } from "@/components/dashboard/social-media-live-preview";
import Link from "next/link";

interface PlatformOption {
  id: SocialPlatform;
  name: string;
  tag: string;
}

const PLATFORMS: PlatformOption[] = [
  { id: "facebook", name: "Facebook", tag: "Text, photo, video" },
  { id: "instagram", name: "Instagram", tag: "Photo or Reel" },
  { id: "linkedin", name: "LinkedIn", tag: "Text, photo, video" },
  { id: "youtube", name: "YouTube", tag: "Video only" },
];

interface PlatformContent {
  title?: string;
  caption: string;
  hashtags: string;
  keywords?: string[];
  youtubePrivacy?: "private" | "unlisted" | "public";
  alt_text?: string;
  alternatives?: string[];
  rationale?: string;
}

type Destination = { id: string; platform: SocialPlatform; account_name: string; account_handle?: string; avatar_url?: string; status: string };

export default function CreatePostPage() {
  const router = useRouter();

  // Media
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = React.useState<string | null>(null);
  const [isVideo, setIsVideo] = React.useState(false);
  const [duration, setDuration] = React.useState<number>();
  const [draftId, setDraftId] = React.useState<string>();
  const [savedAssetId, setSavedAssetId] = React.useState<string>();

  // Platform selection
  const [accounts, setAccounts] = React.useState<Destination[]>([]);
  const [accountIds, setAccountIds] = React.useState<string[]>([]);
  const connectedPlatforms = accounts.map((account) => account.platform);
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<SocialPlatform[]>([]);
  const destinationChosen = React.useRef(false);

  const [activeTab, setActiveTab] = React.useState<SocialPlatform>("instagram");

  // Fetch real connected accounts on load
  React.useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          const active = ((data.accounts || []) as Destination[]).filter((account) => account.status === "active");
          setAccounts(active);
          if (new URLSearchParams(window.location.search).has("draft")) return;
          setAccountIds(active.map((account) => account.id));
          if (active.length > 0 && !destinationChosen.current) {
            const platforms = [...new Set(active.map((account) => account.platform))];
            setSelectedPlatforms(platforms);
            setActiveTab(platforms[0]);
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
  const [captionLength, setCaptionLength] = React.useState<"short" | "standard" | "detailed">("standard");
  const [hashtagLimit, setHashtagLimit] = React.useState(10);
  const [summary, setSummary] = React.useState("");
  const [review, setReview] = React.useState(false);
  const requestId = React.useRef<string | undefined>(undefined);
  const uploadedAsset = React.useRef<{ file: File; id: string } | undefined>(undefined);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [autoGenerate, setAutoGenerate] = React.useState(true);

  // Scheduling
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [weeklyOccurrences, setWeeklyOccurrences] = React.useState(1);
  const [scheduledDateTime, setScheduledDateTime] = React.useState("");

  // Submitting
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isConvertingVideo, setIsConvertingVideo] = React.useState(false);
  const [uploadPublishing, setUploadPublishing] = React.useState(false);
  const [autoUploadFailed, setAutoUploadFailed] = React.useState(false);
  const uploadRequest = React.useRef<XMLHttpRequest | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("draft");
    const asset = params.get("media") || params.get("assetId");
    const controller = new AbortController();
    if (!id) {
      if (!asset) return;
      fetch("/api/media/" + encodeURIComponent(asset), { signal: controller.signal }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("Media unavailable");
        setSavedAssetId(data.media.id);
        setMediaPreview(data.previewUrl);
        setIsVideo(data.media.mime_type.startsWith("video/"));
      }).catch(() => { if (!controller.signal.aborted) toast.error("Could not attach the saved media."); });
      return () => controller.abort();
    }
    fetch("/api/posts/" + encodeURIComponent(id), { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || data.post.status !== "draft") throw new Error("Draft unavailable");
      const post = data.post;
      setDraftId(post.id);
      setTopicPrompt(post.raw_prompt || post.title || "");
      setSelectedPlatforms(post.target_platforms);
      setAccountIds((post.post_targets ?? []).map((target: { social_account_id: string }) => target.social_account_id));
      setActiveTab(post.target_platforms[0] || "instagram");
      setSavedAssetId(post.media_asset_id || undefined);
      setMediaPreview(data.previewUrl || null);
      setIsVideo(data.mediaType === "video");
      setPlatformContents((current) => {
        const updated = { ...current };
        for (const variant of post.post_variants) {
          const platform = variant.platform as SocialPlatform;
          updated[platform] = { caption: variant.caption, title: variant.title, hashtags: (variant.hashtags || []).join(" "),
            keywords: variant.keywords, youtubePrivacy: variant.youtube_privacy ?? undefined, alt_text: variant.alt_text ?? undefined };
        }
        return updated;
      });
    }).catch(() => { if (!controller.signal.aborted) toast.error("Could not load the saved draft."); });
    return () => controller.abort();
  }, []);

  // Toggle platform
  const togglePlatform = (id: SocialPlatform) => {
    destinationChosen.current = true;
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

  const generatedPlatforms = React.useRef<SocialPlatform[]>([]);
  const clearGeneratedCaptions = () => {
    const platforms = generatedPlatforms.current;
    generatedPlatforms.current = [];
    setSummary("");
    if (platforms.length) setPlatformContents((previous) => {
      const updated = { ...previous };
      for (const platform of platforms) updated[platform] = { caption: "", hashtags: "" };
      return updated;
    });
  };

  async function storeFile(file: File) {
    if (uploadedAsset.current?.file === file) return uploadedAsset.current.id;
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      const id = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        uploadRequest.current = xhr;
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
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        xhr.send(form);
      });
      uploadedAsset.current = { file, id };
      return id;
    } finally {
      uploadRequest.current = null;
      setUploadProgress(null);
    }
  }

  async function publishUpload(file: File) {
    setIsPublishing(true);
    setAutoUploadFailed(false);
    const notice = toast.loading("Uploading for automatic publishing");
    try {
      const mediaAssetId = await storeFile(file);
      toast.loading("Analyzing the stored upload and validating destinations", { id: notice });
      const response = await fetch("/api/automation/uploads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.duplicate ? "This upload already has a publishing record" : "Post queued for your authorized accounts", { id: notice });
      router.push("/dashboard/history");
    } catch (error) {
      setAutoUploadFailed(true);
      toast.error(error instanceof Error ? error.message : "Automatic upload publishing failed", { id: notice });
    } finally {
      setIsPublishing(false);
    }
  }

  const chooseFile = (file?: File) => {
    if (!file || isGenerating || isPublishing) return;

    if (file.size > (file.type.startsWith("video/") ? 100 : 15) * 1024 * 1024) {
      toast.error("File exceeds the upload size limit");
      return;
    }

    clearGeneratedCaptions();
    setAutoUploadFailed(false);
    setSavedAssetId(undefined);
    setSelectedFile(file);
    setDuration(undefined);
    const isVid = file.type.startsWith("video/");
    setIsVideo(isVid);

    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);
    if (uploadPublishing && !draftId) void publishUpload(file);
    else if (autoGenerate) {
      const platforms = selectedPlatforms.length ? selectedPlatforms : [activeTab];
      destinationChosen.current = true;
      if (!selectedPlatforms.length) setSelectedPlatforms(platforms);
      void handleGenerateAI(file, platforms);
    }
  };

  const removeFile = () => {
    if (isGenerating || isPublishing) return;
    clearGeneratedCaptions();
    setSavedAssetId(undefined);
    setSelectedFile(null);
    setMediaPreview(null);
    setDuration(undefined);
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

  const handleConvertToVideo = async () => {
    if (!selectedFile) return;
    setIsConvertingVideo(true);
    const notice = toast.loading("Converting image into YouTube video clip (1080p)...");
    try {
      const videoFile = await convertImageToVideo(selectedFile);
      chooseFile(videoFile);
      toast.success("Image successfully converted to MP4 video for YouTube!", { id: notice });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video conversion failed", { id: notice });
    } finally {
      setIsConvertingVideo(false);
    }
  };

  const handleGenerateAI = async (attachedFile?: File, platforms = selectedPlatforms) => {
    if (!platforms.length || (!attachedFile && !selectedFile && !savedAssetId && !topicPrompt.trim())) {
      toast.error("Select a platform and add media or text context.");
      return;
    }
    setIsGenerating(true);
    const notice = toast.loading("Generating platform captions");
    try {
      let file: Blob | null = attachedFile ?? selectedFile;
      if (!file && savedAssetId) {
        const asset = await fetch("/api/media/" + encodeURIComponent(savedAssetId));
        if (!asset.ok) throw new Error("Could not access the saved media.");
        const { previewUrl } = await asset.json();
        setMediaPreview(previewUrl);
        const saved = await fetch(previewUrl).catch(() => null);
        if (!saved?.ok) throw new Error("Could not read the saved media. Reattach it and try again.");
        file = await saved.blob();
      }
      const media = file ? await prepareMediaPreview(file, file.type ? file.type.startsWith("video/") : isVideo) : {};
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...media, prompt: topicPrompt, language, tone, captionLength, hashtagLimit,
          targetPlatforms: platforms, alternatives: true }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not generate captions");
      setSummary(result.data.summary);
      generatedPlatforms.current = [...new Set([...generatedPlatforms.current, ...platforms])];
      setPlatformContents((previous) => {
        const updated = { ...previous };
        for (const p of platforms) {
          const variant = result.variants[p];
          if (variant) updated[p] = { ...variant, hashtags: variant.hashtags.join(" "), youtubePrivacy: previous[p].youtubePrivacy };
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

  const handleSubmit = async (isDraft = false, queueNext = false) => {
    const customSchedule = isScheduled && !queueNext;
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
      if (selectedPlatforms.some((p) => !accounts.some((account) => account.platform === p && accountIds.includes(account.id)))) {
        toast.error("Choose a connected account for each selected platform.");
        return;
      }
      if (customSchedule && (!scheduledDateTime || new Date(scheduledDateTime).getTime() <= Date.now())) {
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
      const mediaAssetId = selectedFile ? await storeFile(selectedFile) : savedAssetId;

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          mediaAssetId, draft: isDraft, replaceDraft: !!draftId, title: ytVideoTitle || topicPrompt.trim() || "Untitled post",
          rawPrompt: topicPrompt,
          publishingMode: isDraft || review ? "manual_approval" : "automatic",
          queueNext,
          accountIds: accounts.filter((account) => selectedPlatforms.includes(account.platform) && accountIds.includes(account.id)).map((account) => account.id),
          scheduledFor: !isDraft && customSchedule ? new Date(scheduledDateTime).toISOString() : undefined,
          recurrences: customSchedule && !isDraft && !review ? Array.from({ length: weeklyOccurrences - 1 }, (_, index) => {
            const date = new Date(scheduledDateTime);
            date.setDate(date.getDate() + 7 * (index + 1));
            return date.toISOString();
          }) : [],
          targetPlatforms: selectedPlatforms,
          variants: selectedPlatforms.map((platform) => {
            const content = platformContents[platform];
            return { platform, title: platform === "youtube" ? ytVideoTitle : content.title,
              caption: content.caption, hashtags: content.hashtags.split(/\s+/).filter(Boolean),
              keywords: content.keywords?.map((keyword) => keyword.trim()).filter(Boolean), language, tone,
              youtubePrivacy: platform === "youtube" ? content.youtubePrivacy ?? "private" : undefined,
              altText: platform === "instagram" && !isVideo ? content.alt_text : undefined };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status < 500) requestId.current = undefined;
        throw new Error(data.error || "Could not save this post");
      }
      requestId.current = undefined;
      toast.success(isDraft ? "Draft saved" : review ? "Sent for approval" : queueNext ? "Queued for " + new Date(data.post.scheduled_for).toLocaleString() : customSchedule ? "Post scheduled" : "Post queued for publishing");
      router.push(isDraft ? "/dashboard/drafts" : review ? "/dashboard/approvals" : queueNext ? "/dashboard/queue" : customSchedule ? "/dashboard/calendar" : "/dashboard/history");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the post");
    } finally {
      setUploadProgress(null);
      setIsPublishing(false);
    }
  };

  const currentContent = platformContents[activeTab] || { caption: "", hashtags: "" };
  const previewAccount = accounts.find((account) => account.platform === activeTab && accountIds.includes(account.id));

  return (
    <div className="space-y-6">
      {uploadProgress !== null && <div className="space-y-2"><label className="block text-sm">Uploading media ({uploadProgress}%)
        <progress className="block w-full" max={100} value={uploadProgress} />
      </label><Button type="button" size="sm" variant="outline" onClick={() => uploadRequest.current?.abort()}>Cancel upload</Button></div>}
      {!draftId && <UploadPublishingSettings onEnabledChange={setUploadPublishing} busy={isPublishing || isGenerating} />}
      {uploadPublishing && autoUploadFailed && selectedFile &&
        <Button type="button" variant="outline" disabled={isPublishing} onClick={() => void publishUpload(selectedFile)}>Retry automatic upload publishing</Button>}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create a post
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attach media, tailor captions, and choose when to publish.
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
              Media
            </h2>

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={autoGenerate} onChange={(event) => setAutoGenerate(event.target.checked)} />
              Generate captions when media is attached
            </label>
            {mediaPreview ? (
              <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
                {isVideo ? (
                  <video
                    src={mediaPreview}
                    controls
                    onLoadedMetadata={(event) => {
                      const seconds = event.currentTarget.duration;
                      if (Number.isFinite(seconds)) setDuration(Math.round(seconds));
                    }}
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
                    {selectedFile?.name || "Saved media"}{duration !== undefined && " · " + Math.floor(duration / 60) + ":" + String(duration % 60).padStart(2, "0")}
                  </span>
                  <button
                    disabled={isGenerating || isPublishing}
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
                    JPEG, PNG and WebP up to 15 MB. MP4, MOV and WebM up to 100 MB.
                  </p>
                </div>
                <input
                  type="file"
                  disabled={isGenerating || isPublishing}
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                  className="sr-only"
                />
              </label>
            )}
            {mediaPreview && !isVideo && selectedPlatforms.includes("youtube") && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-500">
                  <Video className="h-4 w-4" />
                  <span>YouTube Video Format Required</span>
                </div>
                <p className="text-muted-foreground">
                  YouTube requires video media. Convert this photo into a 5-second video (1080p, with audio track) ready for YouTube publishing?
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isConvertingVideo || isGenerating || isPublishing}
                  onClick={handleConvertToVideo}
                  className="text-xs h-8 border-amber-500/40 hover:bg-amber-500/20 text-foreground"
                >
                  {isConvertingVideo ? "Converting to Video..." : "Convert Image to Video for YouTube"}
                </Button>
              </div>
            )}
          </div>

          {/* Platforms Selection */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Destinations
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const isConnected = connectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-foreground bg-accent/40 text-foreground font-semibold"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card/90 p-1.5 border border-border/60 shrink-0 shadow-sm">
                        <PlatformIcon platform={platform.id} className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          <span>{platform.name}</span>
                          {isConnected ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Connected & Active" />
                          ) : (
                            <Link
                              href="/dashboard/accounts"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-normal text-amber-500 hover:underline font-mono"
                              title="Connect account in Accounts page"
                            >
                              (Offline)
                            </Link>
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
            {selectedPlatforms.some((p) => !connectedPlatforms.includes(p)) && (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                <span>Selected destination requires an active connected channel.</span>
                <Link href="/dashboard/accounts" className="font-semibold underline ml-2 shrink-0 hover:text-amber-500">
                  Connect channel →
                </Link>
              </div>
            )}
            {accounts.filter((account) => selectedPlatforms.includes(account.platform)).length > 0 && <fieldset className="grid gap-2 text-sm">
              <legend className="mb-2 text-xs font-semibold text-muted-foreground">Publishing accounts</legend>
              {accounts.filter((account) => selectedPlatforms.includes(account.platform)).map((account) => <label key={account.id} className="flex items-center gap-2">
                <input type="checkbox" checked={accountIds.includes(account.id)} onChange={(event) => {
                  const checked = event.target.checked;
                  setAccountIds((current) => checked ? [...current, account.id] : current.filter((id) => id !== account.id));
                }} />
                <PlatformIcon platform={account.platform} className="size-4 shrink-0" /> <span className="break-all">{account.account_name}</span>
              </label>)}
            </fieldset>}
            {!accounts.length && <Link href="/dashboard/accounts" className="text-xs underline underline-offset-2">Manage connected accounts</Link>}
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
              <div className="flex flex-wrap gap-3">
                <label className="text-xs">Caption length
                  <select value={captionLength} className="ml-2 rounded border bg-background p-1"
                    onChange={(event) => setCaptionLength(event.target.value as typeof captionLength)}>
                    <option value="short">Short</option><option value="standard">Standard</option><option value="detailed">Detailed</option>
                  </select>
                </label>
                <label className="text-xs">Hashtag limit
                  <input className="ml-2 w-16 rounded border bg-background p-1" type="number" value={hashtagLimit} min={0} max={30}
                    onChange={(event) => setHashtagLimit(Math.min(30, Math.max(0, Math.trunc(Number(event.target.value)) || 0)))} />
                </label>
              </div>
              <Button
                type="button"
                variant="stitch"
                onClick={() => void handleGenerateAI()}
                disabled={isGenerating}
                className="w-full text-xs font-semibold gap-2 h-10 shadow-md shadow-indigo-500/20"
              >
                <Sparkles className="h-4 w-4 animate-pulse" />
                {isGenerating ? "Analyzing with Gemini Multimodal AI…" : "Generate with Gemini AI"}
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
              {activeTab === "youtube" && <label className="block text-xs font-medium">
                YouTube visibility
                <select className="ml-2 rounded border bg-background p-1" value={currentContent.youtubePrivacy ?? "private"}
                  onChange={(event) => {
                    const youtubePrivacy = event.target.value as PlatformContent["youtubePrivacy"];
                    setPlatformContents((previous) => ({ ...previous, youtube: { ...previous.youtube, youtubePrivacy } }));
                  }}>
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </label>}
              {activeTab === "instagram" && !isVideo && mediaPreview && <label className="block text-xs font-medium">
                Instagram image description
                <Input value={currentContent.alt_text ?? ""} maxLength={1000} placeholder="Describe the image for screen readers"
                  onChange={(event) => setPlatformContents((previous) => ({
                    ...previous, instagram: { ...previous.instagram, alt_text: event.target.value },
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

          {selectedPlatforms.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  Real-Time Feed Preview
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!currentContent.caption.trim()}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText([currentContent.caption, currentContent.hashtags].filter(Boolean).join("\n\n"));
                      toast.success("Caption and hashtags copied to clipboard!");
                    } catch {
                      toast.error("Could not copy caption");
                    }
                  }}
                  className="h-7 text-[11px] gap-1"
                >
                  Copy Caption
                </Button>
              </div>

              <SocialMediaLivePreview
                platform={activeTab}
                caption={currentContent.caption}
                hashtags={currentContent.hashtags}
                title={currentContent.title || topicPrompt}
                mediaUrl={mediaPreview}
                isVideo={isVideo}
                authorName={previewAccount?.account_name || "SocialSync Creator"}
                authorAvatar={previewAccount?.avatar_url || null}
                authorHandle={previewAccount?.account_handle || `@${activeTab}_user`}
              />
            </div>
          )}
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isPublishing || isGenerating}
              className="flex-1 text-xs font-semibold gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleSubmit(false, true)}
              disabled={isPublishing || isGenerating} title="Uses the next available hourly slot">
              Add to queue
            </Button>

            <Button
              type="button"
              variant="stitch"
              onClick={() => handleSubmit(false)}
              disabled={isPublishing || isGenerating}
              className="flex-1 text-xs font-semibold gap-1.5 h-10 shadow-md shadow-indigo-500/25"
            >
              {isScheduled ? (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  {isPublishing ? "Scheduling..." : "Schedule Post"}
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {isPublishing ? "Queuing…" : selectedPlatforms.length > 1 && !review ? "Publish Everywhere" : "Publish Now"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
