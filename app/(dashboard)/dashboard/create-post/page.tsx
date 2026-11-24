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
  AtSign,
  UserPlus,
  Eye,
  Smile,
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { prepareMediaPreview } from "@/lib/ai/media-preview";
import { convertImageToVideo, autoFormatImage, formatImageForInstagram } from "@/lib/media/image-to-video";
import { UploadPublishingSettings } from "@/components/dashboard/upload-publishing-settings";
import { SocialPlatform, SupportedTone } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";
import { SocialMediaLivePreview } from "@/components/dashboard/social-media-live-preview";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PlatformOption {
  id: SocialPlatform;
  name: string;
  tag: string;
  maxChars: number;
}

const PLATFORMS: PlatformOption[] = [
  { id: "instagram", name: "Instagram", tag: "Photo or Reel", maxChars: 2200 },
  { id: "facebook", name: "Facebook", tag: "Text, photo, video", maxChars: 63206 },
  { id: "linkedin", name: "LinkedIn", tag: "Text, photo, video", maxChars: 3000 },
  { id: "youtube", name: "YouTube", tag: "Video only", maxChars: 5000 },
];

const QUICK_EMOJIS = ["🔥", "🚀", "✨", "💡", "👏", "👇", "📈", "🎯", "🙌", "❤️", "🤝", "⚡"];

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

  // Mobile step switcher: 1 = Channels & Media, 2 = AI & Copy, 3 = Preview & Publish
  const [mobileStep, setMobileStep] = React.useState<1 | 2 | 3>(1);

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
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<SocialPlatform[]>(["instagram"]);
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
        console.warn("Failed to fetch connected accounts:", e);
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
  const [hashtagLimit, setHashtagLimit] = React.useState(8);
  const [summary, setSummary] = React.useState("");
  const [review, setReview] = React.useState(false);
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
  const [targetPhotoFormat, setTargetPhotoFormat] = React.useState<"jpeg" | "png">("jpeg");
  const [uploadPublishing, setUploadPublishing] = React.useState(false);
  const [autoUploadFailed, setAutoUploadFailed] = React.useState(false);
  const [mentionInput, setMentionInput] = React.useState("");
  const [showMentionBar, setShowMentionBar] = React.useState(false);
  const uploadRequest = React.useRef<XMLHttpRequest | null>(null);

  const handleAddMention = (handle: string) => {
    const cleanHandle = handle.startsWith("@") ? handle.trim() : `@${handle.trim()}`;
    if (!cleanHandle || cleanHandle === "@") return;
    const currentCaption = currentContent.caption || "";
    const space = currentCaption.length > 0 && !currentCaption.endsWith(" ") && !currentCaption.endsWith("\n") ? " " : "";
    updateCurrentCaption(currentCaption + space + cleanHandle + " ");
    setMentionInput("");
  };

  const handleInsertEmoji = (emoji: string) => {
    const currentCaption = currentContent.caption || "";
    updateCurrentCaption(currentCaption + emoji);
  };

  // Draft loading
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

  // Toggle platform selection
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
      // 1. Try Direct Supabase Storage Upload
      try {
        const directInitRes = await fetch("/api/media/direct-upload", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size }),
        });

        if (directInitRes.ok) {
          const directData = await directInitRes.json();
          if (directData.signedUrl && directData.path) {
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              uploadRequest.current = xhr;
              xhr.open("PUT", directData.signedUrl);
              xhr.setRequestHeader("Content-Type", directData.fileType || file.type || "application/octet-stream");
              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
              };
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error("Direct upload failed with status " + xhr.status));
              };
              xhr.onerror = () => reject(new Error("Network error during direct storage upload"));
              xhr.onabort = () => reject(new Error("Direct storage upload cancelled"));
              xhr.send(file);
            });

            const completeRes = await fetch("/api/media/direct-upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: directData.path,
                fileName: file.name,
                fileType: directData.fileType || file.type,
                fileSize: file.size,
                width: isVideo ? 1920 : 1080,
                height: isVideo ? 1080 : 1080,
                duration: 30,
              }),
            });

            if (completeRes.ok) {
              const assetData = await completeRes.json();
              if (assetData.asset?.id) {
                uploadedAsset.current = { file, id: assetData.asset.id };
                return assetData.asset.id;
              }
            }
          }
        }
      } catch (directErr) {
        console.warn("Direct upload fallback to standard API route:", directErr);
      }

      // 2. Standard Fallback
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
    const notice = toast.loading("Uploading for automatic publishing...");
    try {
      const mediaAssetId = await storeFile(file);
      toast.loading("Analyzing upload & queueing destinations...", { id: notice });
      const response = await fetch("/api/automation/uploads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.duplicate ? "This upload already has a publishing record" : "Post queued for your authorized channels!", { id: notice });
      router.push("/dashboard/history");
    } catch (error) {
      setAutoUploadFailed(true);
      toast.error(error instanceof Error ? error.message : "Automatic upload publishing failed", { id: notice });
      const platforms = selectedPlatforms.length ? selectedPlatforms : [activeTab];
      void handleGenerateAI(file, platforms);
    } finally {
      setIsPublishing(false);
    }
  }

  const chooseFile = async (rawFile?: File) => {
    if (!rawFile || isGenerating || isPublishing) return;

    if (rawFile.size > (rawFile.type.startsWith("video/") ? 100 : 15) * 1024 * 1024) {
      toast.error("File exceeds upload limit (15MB for images, 100MB for video)");
      return;
    }

    clearGeneratedCaptions();
    setAutoUploadFailed(false);
    setSavedAssetId(undefined);
    setDuration(undefined);

    let file = rawFile;
    const isVid = rawFile.type.startsWith("video/");
    const platforms = selectedPlatforms.length ? selectedPlatforms : [activeTab];

    if (!isVid) {
      try {
        const formatted = await formatImageForInstagram(rawFile);
        if (formatted !== rawFile) file = formatted;
      } catch {
        // Fall back to original file
      }
    }

    setSelectedFile(file);
    setIsVideo(isVid);

    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);
    if (uploadPublishing && !draftId) void publishUpload(file);
    else if (autoGenerate) {
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

  const updateCurrentTitle = (newTitle: string) => {
    setPlatformContents((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], title: newTitle },
    }));
  };

  const updateCurrentCaption = (newCaption: string) => {
    setPlatformContents((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], caption: newCaption },
    }));
  };

  const updateCurrentHashtags = (newHashtags: string) => {
    setPlatformContents((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], hashtags: newHashtags },
    }));
  };

  const handleConvertToVideo = async () => {
    if (!selectedFile) return;
    setIsConvertingVideo(true);
    const notice = toast.loading("Generating 30s 1080p video with FFmpeg & FFprobe...");
    try {
      const videoFile = await convertImageToVideo(selectedFile, 30);
      chooseFile(videoFile);
      toast.success("30-second 1080p MP4 generated for YouTube!", { id: notice });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video conversion failed", { id: notice });
    } finally {
      setIsConvertingVideo(false);
    }
  };

  const handleAutoFormatPhoto = async (format: "jpeg" | "png") => {
    if (!selectedFile || isVideo) return;
    setTargetPhotoFormat(format);
    const notice = toast.loading(`Auto-sizing photo into 1080p ${format.toUpperCase()}...`);
    try {
      const formatted = await autoFormatImage(selectedFile, { format, targetRatio: "auto" });
      setSelectedFile(formatted);
      const objectUrl = URL.createObjectURL(formatted);
      setMediaPreview(objectUrl);
      toast.success(`Photo auto-sized to 1080p ${format.toUpperCase()}!`, { id: notice });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-sizing failed", { id: notice });
    }
  };

  const handleGenerateAI = async (attachedFile?: File, platforms = selectedPlatforms) => {
    const targetPlatforms = platforms.length ? platforms : (selectedPlatforms.length ? selectedPlatforms : [activeTab]);
    if (!targetPlatforms.length || (!attachedFile && !selectedFile && !savedAssetId && !topicPrompt.trim())) {
      toast.error("Select a destination channel and provide media or topic text.");
      return;
    }
    setIsGenerating(true);
    const notice = toast.loading("Generating multi-platform copy with SocialSync AI...");
    try {
      let file: Blob | null = attachedFile ?? selectedFile;
      if (!file && savedAssetId) {
        const asset = await fetch("/api/media/" + encodeURIComponent(savedAssetId));
        if (!asset.ok) throw new Error("Could not access saved media asset.");
        const { previewUrl } = await asset.json();
        setMediaPreview(previewUrl);
        const saved = await fetch(previewUrl).catch(() => null);
        if (!saved?.ok) throw new Error("Could not read saved media. Reattach and try again.");
        file = await saved.blob();
      }
      const media = file ? await prepareMediaPreview(file, file.type ? file.type.startsWith("video/") : isVideo) : {};
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...media,
          prompt: attachedFile && !attachedFile.type.startsWith("video/") ? undefined : topicPrompt.trim() || undefined,
          language,
          tone,
          captionLength,
          hashtagLimit,
          targetPlatforms,
          alternatives: true,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not generate captions");
      setSummary(result.data.summary);
      generatedPlatforms.current = [...new Set([...generatedPlatforms.current, ...targetPlatforms])];
      setPlatformContents((previous) => {
        const updated = { ...previous };
        for (const p of targetPlatforms) {
          const variant = result.variants[p];
          if (variant) {
            const tags = (variant.hashtags || []).map((t: string) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
            const captionWithHashtags = tags && !variant.caption.includes("#")
              ? `${variant.caption}\n\n${tags}`
              : variant.caption;
            updated[p] = {
              ...variant,
              caption: captionWithHashtags,
              hashtags: tags,
              youtubePrivacy: previous[p].youtubePrivacy,
            };
          }
        }
        return updated;
      });
      toast.success("AI captions ready for review!", { id: notice });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate captions", { id: notice });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (isDraft = false, queueNext = false) => {
    const customSchedule = isScheduled && !queueNext;
    if (!selectedPlatforms.length) {
      toast.error("Select at least one destination platform.");
      return;
    }
    const ytVideoTitle = platformContents.youtube.title?.trim() || topicPrompt.trim();
    let uploadFile = selectedFile;
    if (!isDraft) {
      const missing = selectedPlatforms.find((p) => !platformContents[p].caption.trim());
      if (missing) {
        setActiveTab(missing);
        toast.error(`Add a caption for ${missing}.`);
        return;
      }
      if (selectedPlatforms.some((p) => !accounts.some((account) => account.platform === p && accountIds.includes(account.id)))) {
        toast.error("Choose a connected account for each selected platform.");
        return;
      }
      if (customSchedule && (!scheduledDateTime || new Date(scheduledDateTime).getTime() <= Date.now())) {
        toast.error("Choose a future schedule date and time.");
        return;
      }
      if (selectedPlatforms.includes("youtube") && !isVideo && !ytVideoTitle) {
        toast.error("YouTube requires a title.");
        return;
      }
    }

    setIsPublishing(true);
    const notice = toast.loading(isDraft ? "Saving draft..." : customSchedule ? "Scheduling post..." : "Publishing to destinations...");
    try {
      let mediaAssetId = savedAssetId;
      if (!mediaAssetId && uploadFile && !uploadFile.type.startsWith("video/") && selectedPlatforms.includes("youtube")) {
        const convNotice = toast.loading("Converting photo into 30s 1080p MP4 for YouTube...", { id: notice });
        try {
          uploadFile = await convertImageToVideo(uploadFile, 30);
          setSelectedFile(uploadFile);
          setIsVideo(true);
        } catch (convErr) {
          toast.error("Could not convert image for YouTube", { id: convNotice });
          throw convErr;
        }
      }

      if (!mediaAssetId && uploadFile) {
        mediaAssetId = await storeFile(uploadFile);
        setSavedAssetId(mediaAssetId);
      }

      const postVariants = selectedPlatforms.map((platform) => ({
        platform,
        caption: platformContents[platform].caption,
        title: platform === "youtube" ? ytVideoTitle : (platformContents[platform].title?.trim() || undefined),
        hashtags: platformContents[platform].hashtags.split(/\s+/).filter((t) => t.length > 1),
        keywords: platformContents[platform].keywords,
        youtube_privacy: platform === "youtube" ? (platformContents.youtube.youtubePrivacy || "public") : undefined,
        alt_text: platformContents[platform].alt_text,
      }));

      const targets = accounts
        .filter((account) => selectedPlatforms.includes(account.platform) && accountIds.includes(account.id))
        .map((account) => ({ social_account_id: account.id, platform: account.platform }));

      const postTitle = ytVideoTitle || platformContents[activeTab].caption.slice(0, 50) || "SocialSync Post";

      const url = draftId ? `/api/posts/${encodeURIComponent(draftId)}` : "/api/posts/create";
      const method = draftId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle,
          status: isDraft ? "draft" : review ? "pending" : customSchedule ? "scheduled" : "queued",
          targetPlatforms: selectedPlatforms,
          mediaAssetId: mediaAssetId || null,
          postVariants,
          postTargets: isDraft ? [] : targets,
          scheduledFor: customSchedule ? new Date(scheduledDateTime).toISOString() : null,
          weeklyOccurrences: customSchedule && !review ? weeklyOccurrences : 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save post");

      toast.success(
        isDraft ? "Draft saved successfully!" : customSchedule ? "Post scheduled successfully!" : "Post published across all channels!",
        { id: notice }
      );
      router.push("/dashboard/history");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete operation", { id: notice });
    } finally {
      setUploadProgress(null);
      setIsPublishing(false);
    }
  };

  const currentContent = platformContents[activeTab] || { caption: "", hashtags: "" };
  const currentPlatformMeta = PLATFORMS.find((p) => p.id === activeTab) || PLATFORMS[0];
  const previewAccount = accounts.find((account) => account.platform === activeTab && accountIds.includes(account.id));

  return (
    <div className="space-y-5">
      {/* Upload Progress Bar if active */}
      {uploadProgress !== null && (
        <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            <span>Uploading media asset ({uploadProgress}%)...</span>
            <button type="button" onClick={() => uploadRequest.current?.abort()} className="underline hover:text-foreground">
              Cancel
            </button>
          </div>
          <div className="h-1.5 w-full bg-indigo-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Header with Title and Mobile Step Wizard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Post Composer</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              3-Column Studio
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attach media, generate tailored AI captions, and preview live across every platform.
          </p>
        </div>

        {/* Mobile Step Indicator Tabs (visible only on small screens) */}
        <div className="flex xl:hidden items-center p-1 rounded-xl bg-muted/60 border border-border/60 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMobileStep(1)}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all text-center",
              mobileStep === 1 ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            1. Channels &amp; Media
          </button>
          <button
            type="button"
            onClick={() => setMobileStep(2)}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all text-center",
              mobileStep === 2 ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            2. AI &amp; Captions
          </button>
          <button
            type="button"
            onClick={() => setMobileStep(3)}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all text-center",
              mobileStep === 3 ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            3. Preview &amp; Publish
          </button>
        </div>
      </div>

      {/* 3-Column Desktop Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        
        {/* ======================================================== */}
        {/* COLUMN 1 (Left): Platforms & Accounts (3 cols / 25%)    */}
        {/* ======================================================== */}
        <div className={cn("xl:col-span-3 space-y-4", mobileStep !== 1 && "hidden xl:block")}>
          {/* Platform Selector Box */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Destinations
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                {selectedPlatforms.length} selected
              </span>
            </div>

            <div className="space-y-2">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const isConnected = connectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group",
                      isSelected
                        ? "border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-950/20 text-foreground font-medium shadow-xs"
                        : "border-border/70 text-muted-foreground hover:border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-background p-1.5 border border-border/60 shrink-0 flex items-center justify-center">
                        <PlatformIcon platform={platform.id} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span>{platform.name}</span>
                          {isConnected ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Connected" />
                          ) : (
                            <span className="text-[10px] text-amber-500 font-normal font-mono">(Offline)</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{platform.tag}</p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-md flex items-center justify-center border transition-colors shrink-0",
                        isSelected
                          ? "bg-indigo-600 text-white border-transparent"
                          : "border-border/80 bg-background"
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Offline Destination Warning */}
            {selectedPlatforms.some((p) => !connectedPlatforms.includes(p)) && (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-600 dark:text-amber-400 space-y-1">
                <p>One or more selected channels require authentication.</p>
                <Link href="/dashboard/accounts" className="font-semibold underline block hover:text-amber-500">
                  Connect channels in Settings →
                </Link>
              </div>
            )}
          </div>

          {/* Account Multi-Selection */}
          {accounts.filter((a) => selectedPlatforms.includes(a.platform)).length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/50">
                Active Profiles
              </h2>
              <div className="space-y-2">
                {accounts
                  .filter((a) => selectedPlatforms.includes(a.platform))
                  .map((account) => (
                    <label
                      key={account.id}
                      className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1.5 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={accountIds.includes(account.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAccountIds((curr) => (checked ? [...curr, account.id] : curr.filter((id) => id !== account.id)));
                        }}
                        className="rounded border-border text-indigo-600 focus:ring-indigo-500"
                      />
                      <PlatformIcon platform={account.platform} className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-medium">{account.account_name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Schedule Settings Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Schedule Release
                </h2>
              </div>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="h-4 w-4 rounded border-border text-indigo-600 cursor-pointer"
              />
            </div>

            {isScheduled && (
              <div className="space-y-3 pt-1 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Date &amp; Time (Local)</label>
                  <Input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="text-xs font-mono rounded-xl h-9"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={review}
                    onChange={(e) => setReview(e.target.checked)}
                    className="rounded border-border text-indigo-600"
                  />
                  <span>Send to Approval Center</span>
                </label>

                {!review && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Recurrence:</span>
                    <select
                      value={weeklyOccurrences}
                      onChange={(e) => setWeeklyOccurrences(Number(e.target.value))}
                      className="rounded-lg border border-border bg-background p-1 text-xs text-foreground"
                    >
                      {[1, 2, 3, 4, 8].map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? "Once" : `${n} weeks`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Step Next button */}
          <div className="xl:hidden pt-2">
            <Button
              type="button"
              variant="stitch"
              onClick={() => setMobileStep(2)}
              className="w-full h-10 text-xs font-semibold gap-1.5"
            >
              <span>Continue to AI &amp; Captions</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2 (Center): Media & Content Studio (5 cols / 45%) */}
        {/* ======================================================== */}
        <div className={cn("xl:col-span-5 space-y-4", mobileStep !== 2 && "hidden xl:block")}>
          {/* Media Upload & Optimization Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Visual Media
              </h2>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                  className="rounded border-border text-indigo-600"
                />
                <span>Auto-generate captions</span>
              </label>
            </div>

            {mediaPreview ? (
              <div className="relative rounded-xl border border-border/80 overflow-hidden bg-muted/20">
                {isVideo ? (
                  <video
                    src={mediaPreview}
                    controls
                    onLoadedMetadata={(e) => {
                      const sec = e.currentTarget.duration;
                      if (Number.isFinite(sec)) setDuration(Math.round(sec));
                    }}
                    className="w-full max-h-56 object-contain bg-black/40"
                  />
                ) : (
                  <img src={mediaPreview} alt="Attached preview" className="w-full max-h-56 object-contain mx-auto" />
                )}
                <div className="p-2.5 bg-card/90 border-t border-border flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                    {selectedFile?.name || "Stored Asset"} {duration !== undefined && `(${duration}s)`}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 font-medium text-[11px]">
                      <UploadCloud className="h-3.5 w-3.5" /> Replace
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) chooseFile(f);
                        }}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-rose-500 hover:underline flex items-center gap-1 font-medium text-[11px]"
                    >
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) chooseFile(e.dataTransfer.files[0]);
                }}
                className="border-2 border-dashed border-border/80 hover:border-indigo-500/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center space-y-2 bg-muted/10 hover:bg-indigo-500/5 group"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Click or drop image / video</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Images up to 15MB • MP4/WebM videos up to 100MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) chooseFile(f);
                  }}
                  className="sr-only"
                />
              </label>
            )}

            {/* Media Format Optimizations */}
            {mediaPreview && !isVideo && (
              <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    Auto-Size (1080p Standard)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleAutoFormatPhoto("jpeg")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                        targetPhotoFormat === "jpeg" ? "bg-indigo-600 text-white border-indigo-600" : "border-border text-muted-foreground"
                      )}
                    >
                      JPEG
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAutoFormatPhoto("png")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                        targetPhotoFormat === "png" ? "bg-indigo-600 text-white border-indigo-600" : "border-border text-muted-foreground"
                      )}
                    >
                      PNG
                    </button>
                  </div>
                </div>

                {selectedPlatforms.includes("youtube") && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">YouTube requires video:</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isConvertingVideo}
                      onClick={() => void handleConvertToVideo()}
                      className="text-[10px] h-7 px-2.5 gap-1 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                    >
                      <Video className="h-3 w-3" />
                      {isConvertingVideo ? "Encoding..." : "Generate 30s MP4 (FFmpeg)"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Generator Prompt Bar */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  AI Caption &amp; Title Studio
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {(["English", "Tamil", "Tanglish"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      language === lang ? "bg-foreground text-background font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Topic or context (e.g., product release, tip, behind-the-scenes)..."
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                className="text-xs rounded-xl h-9"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as SupportedTone)}
                    className="w-full rounded-lg border border-border bg-background p-1.5 text-xs text-foreground"
                  >
                    {["Professional", "Friendly", "Viral-style", "Motivational", "Educational", "Marketing"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Length</label>
                  <select
                    value={captionLength}
                    onChange={(e) => setCaptionLength(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-background p-1.5 text-xs text-foreground"
                  >
                    <option value="short">Short (1-2 sentences)</option>
                    <option value="standard">Standard (1 paragraph)</option>
                    <option value="detailed">Detailed (multi-paragraph)</option>
                  </select>
                </div>
              </div>

              <Button
                type="button"
                variant="stitch"
                onClick={() => void handleGenerateAI()}
                disabled={isGenerating}
                className="w-full text-xs font-semibold gap-2 h-10 shadow-md shadow-indigo-500/20 rounded-xl"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGenerating ? "Generating with Gemini..." : "Generate Captions & Titles"}</span>
              </Button>
            </div>
          </div>

          {/* Platform Caption & Hashtags Editor */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3.5 shadow-xs">
            {/* Platform Selector Tabs */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                {selectedPlatforms.map((p) => {
                  const isActive = activeTab === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActiveTab(p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all",
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <PlatformIcon platform={p} className="h-3.5 w-3.5" />
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                {currentContent.caption.length}/{currentPlatformMeta.maxChars}
              </span>
            </div>

            {/* Title Input (Required for YouTube) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                <span>{activeTab === "youtube" ? "Video Title (Required)" : "Post Headline / Title (Optional)"}</span>
              </label>
              <Input
                placeholder={activeTab === "youtube" ? "E.g., 5 Rules for Clean SaaS Code" : "Post Headline"}
                value={currentContent.title || ""}
                onChange={(e) => updateCurrentTitle(e.target.value)}
                maxLength={100}
                className="text-xs rounded-xl h-9"
              />
            </div>

            {/* Caption Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">
                  {activeTab === "youtube" ? "Video Description & Notes" : "Post Caption"}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMentionBar(!showMentionBar)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    <AtSign className="h-3 w-3" /> Mention
                  </button>
                </div>
              </div>

              {/* Quick Mention Bar */}
              {showMentionBar && (
                <div className="flex items-center gap-2 p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 animate-in fade-in">
                  <Input
                    placeholder="Enter handle without @ (e.g. vercel)..."
                    value={mentionInput}
                    onChange={(e) => setMentionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMention(mentionInput);
                      }
                    }}
                    className="h-7 text-xs rounded-lg"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddMention(mentionInput)}
                    className="h-7 text-[10px] px-2 rounded-lg"
                  >
                    Insert
                  </Button>
                </div>
              )}

              <Textarea
                placeholder="Write your post caption or let SocialSync AI draft one..."
                rows={5}
                value={currentContent.caption}
                onChange={(e) => updateCurrentCaption(e.target.value)}
                className="text-xs rounded-xl resize-none font-sans leading-relaxed"
              />

              {/* Quick Emoji Toolbar */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto custom-scrollbar">
                <Smile className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="h-6 w-6 rounded-md hover:bg-muted/80 flex items-center justify-center text-xs transition-colors shrink-0"
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Hashtag Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Hashtags (Space separated)
              </label>
              <Input
                placeholder="#growth #automation #saas"
                value={currentContent.hashtags || ""}
                onChange={(e) => updateCurrentHashtags(e.target.value)}
                className="text-xs rounded-xl h-8 font-mono"
              />
            </div>
          </div>

          {/* Mobile Step Back/Next Navigation */}
          <div className="xl:hidden flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileStep(1)}
              className="flex-1 h-10 text-xs font-semibold gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              variant="stitch"
              onClick={() => setMobileStep(3)}
              className="flex-1 h-10 text-xs font-semibold gap-1.5"
            >
              <span>Continue to Preview</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3 (Right): Live Mockup & Actions (4 cols / 30%)   */}
        {/* ======================================================== */}
        <div className={cn("xl:col-span-4 space-y-4 xl:sticky xl:top-20", mobileStep !== 3 && "hidden xl:block")}>
          {/* Live Preview Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-indigo-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  3. Live Post Preview
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Interactive Mockup
              </span>
            </div>

            {/* Platform Preview Selector Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {selectedPlatforms.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActiveTab(p)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize flex items-center gap-1.5 border transition-all shrink-0",
                    activeTab === p
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "border-border/60 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <PlatformIcon platform={p} className="h-3 w-3" />
                  <span>{p}</span>
                </button>
              ))}
            </div>

            {/* Embedded Realistic Social Preview */}
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              <SocialMediaLivePreview
                platform={activeTab}
                caption={currentContent.caption}
                hashtags={currentContent.hashtags}
                title={currentContent.title}
                mediaUrl={mediaPreview}
                isVideo={isVideo}
                authorName={previewAccount?.account_name || "SocialSync AI Workspace"}
                authorHandle={previewAccount?.account_handle || "socialsync_ai"}
                authorAvatar={previewAccount?.avatar_url}
              />
            </div>
          </div>

          {/* Publishing & Draft Actions Box */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs">
            <Button
              type="button"
              variant="stitch"
              disabled={isPublishing || isGenerating}
              onClick={() => void handleSubmit(false)}
              className="w-full h-11 text-xs font-semibold gap-2 rounded-xl shadow-md shadow-indigo-500/20"
            >
              <Send className="h-4 w-4" />
              <span>
                {isPublishing
                  ? "Publishing across channels..."
                  : isScheduled
                  ? "Confirm & Schedule Post"
                  : "Publish Now Everywhere"}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPublishing || isGenerating}
              onClick={() => void handleSubmit(true)}
              className="w-full h-9 text-xs font-medium gap-1.5 rounded-xl border-border/80 hover:bg-muted/60"
            >
              <Save className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Save as Draft</span>
            </Button>
          </div>

          {/* Mobile Step Back button */}
          <div className="xl:hidden pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileStep(2)}
              className="w-full h-10 text-xs font-semibold gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Captions</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
