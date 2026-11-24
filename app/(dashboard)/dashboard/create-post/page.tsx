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
  Image as ImageIcon,
  AtSign,
  UserPlus,
  Eye,
  Smile,
  Clock,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Share2,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  FileImage,
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
  { id: "instagram", name: "Instagram", tag: "Photo or Video (Reel)", maxChars: 2200 },
  { id: "facebook", name: "Facebook", tag: "Photo, Video, or Text", maxChars: 63206 },
  { id: "linkedin", name: "LinkedIn", tag: "Photo, Video, or Text", maxChars: 3000 },
  { id: "youtube", name: "YouTube", tag: "Video Only (MP4/MOV)", maxChars: 5000 },
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

  // Mobile step switcher: 1 = Channels & Media, 2 = Content, 3 = Preview & Publish
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
  const [captionLength, setCaptionLength] = React.useState<"short" | "standard" | "detailed">("detailed");
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
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

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
      const willInclude = !prev.includes(id);
      const next = willInclude ? [...prev, id] : prev.filter((p) => p !== id);
      if (next.length > 0 && !next.includes(activeTab)) {
        setActiveTab(next[0]);
      }
      if (willInclude) {
        // Auto-select accounts for this newly added platform
        const platformAccs = accounts.filter((a) => a.platform === id).map((a) => a.id);
        if (platformAccs.length > 0) {
          setAccountIds((curr) => [...new Set([...curr, ...platformAccs])]);
        }
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
      // 1. Direct Supabase Storage Upload
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
    const notice = toast.loading("Uploading and validating file...");
    try {
      const mediaAssetId = await storeFile(file);
      toast.loading("Queuing post for publication...", { id: notice });
      const response = await fetch("/api/automation/uploads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.duplicate ? "This upload already exists in publishing history" : "Post queued for connected channels", { id: notice });
      router.push("/dashboard/history");
    } catch (error) {
      setAutoUploadFailed(true);
      toast.error(error instanceof Error ? error.message : "Automatic publishing failed", { id: notice });
      const platforms = selectedPlatforms.length ? selectedPlatforms : [activeTab];
      void handleGenerateAI(file, platforms);
    } finally {
      setIsPublishing(false);
    }
  }

  const chooseFile = async (rawFile?: File) => {
    if (!rawFile || isGenerating || isPublishing) return;

    if (rawFile.size > (rawFile.type.startsWith("video/") ? 100 : 15) * 1024 * 1024) {
      toast.error("File exceeds upload limit (15MB for images, 100MB for videos)");
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

    // Pre-upload media in background so it's ready when user clicks publish
    void storeFile(file).then((id) => setSavedAssetId(id)).catch(() => {});

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
    const notice = toast.loading("Converting photo to 30s 1080p MP4 for YouTube...");
    try {
      const videoFile = await convertImageToVideo(selectedFile, 30);
      chooseFile(videoFile);
      toast.success("1080p MP4 generated for YouTube!", { id: notice });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video conversion failed", { id: notice });
    } finally {
      setIsConvertingVideo(false);
    }
  };

  const handleAutoFormatPhoto = async (format: "jpeg" | "png") => {
    if (!selectedFile || isVideo) return;
    setTargetPhotoFormat(format);
    const notice = toast.loading(`Formatting photo to standard 1080p ${format.toUpperCase()}...`);
    try {
      const formatted = await autoFormatImage(selectedFile, { format, targetRatio: "auto" });
      setSelectedFile(formatted);
      const objectUrl = URL.createObjectURL(formatted);
      setMediaPreview(objectUrl);
      toast.success(`Photo formatted to 1080p ${format.toUpperCase()}`, { id: notice });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Formatting failed", { id: notice });
    }
  };

  const handleGenerateAI = async (attachedFile?: File, platforms = selectedPlatforms) => {
    const targetPlatforms = platforms.length ? platforms : (selectedPlatforms.length ? selectedPlatforms : [activeTab]);
    if (!targetPlatforms.length || (!attachedFile && !selectedFile && !savedAssetId && !topicPrompt.trim())) {
      toast.error("Select at least one channel and add a topic or media.");
      return;
    }
    setIsGenerating(true);
    const notice = toast.loading("Generating captions and titles...");
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
          prompt: topicPrompt.trim() || undefined,
          userPrompt: topicPrompt.trim() || undefined,
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
      toast.success("Captions ready for review", { id: notice });
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
      if (selectedPlatforms.includes("instagram") && !uploadFile && !savedAssetId) {
        toast.error("Instagram requires a photo or video to publish. Please attach media in Step 2.");
        setMobileStep(2);
        return;
      }
      if (selectedPlatforms.includes("youtube") && !uploadFile && !savedAssetId) {
        toast.error("YouTube requires a video file. Please attach an MP4/MOV video in Step 2.");
        setMobileStep(2);
        return;
      }
      if (selectedPlatforms.includes("youtube") && !ytVideoTitle) {
        toast.error("YouTube requires a video title.");
        return;
      }
      if (customSchedule && (!scheduledDateTime || new Date(scheduledDateTime).getTime() <= Date.now())) {
        toast.error("Choose a future schedule date and time.");
        return;
      }
    }

    setIsPublishing(true);
    const notice = toast.loading(isDraft ? "Saving draft..." : customSchedule ? "Scheduling post..." : "Publishing to channels...");
    try {
      let mediaAssetId = savedAssetId;
      if (!isDraft && selectedPlatforms.includes("youtube") && !isVideo && uploadFile && !uploadFile.type.startsWith("video/")) {
        toast.error("YouTube only accepts video files. Please deselect YouTube to publish your photo to Facebook, Instagram & LinkedIn, or click 'Convert to Video'.", { id: notice });
        setIsPublishing(false);
        return;
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

      // Resolve publishing destinations for each selected platform
      const targets = selectedPlatforms
        .map((platform) => {
          const matching = accounts.find((a) => a.platform === platform && accountIds.includes(a.id)) ||
                           accounts.find((a) => a.platform === platform);
          return matching ? { social_account_id: matching.id, platform } : null;
        })
        .filter(Boolean) as { social_account_id: string; platform: SocialPlatform }[];

      if (!isDraft && targets.length === 0) {
        toast.error("Please connect at least one active channel account before publishing.", { id: notice });
        setIsPublishing(false);
        return;
      }

      const unconnected = selectedPlatforms.filter((p) => !accounts.some((a) => a.platform === p && a.status === "active"));
      if (!isDraft && unconnected.length > 0) {
        const names = unconnected.map((p) => PLATFORMS.find((pl) => pl.id === p)?.name || p).join(", ");
        toast.error(`Please connect an account for ${names} in Accounts first, or deselect ${names} to publish now.`, { id: notice });
        setIsPublishing(false);
        return;
      }

      const postTitle = ytVideoTitle || platformContents[activeTab].caption.slice(0, 50) || "Social Post";

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle,
          status: isDraft ? "draft" : review ? "pending" : customSchedule ? "scheduled" : "queued",
          draft: isDraft,
          replaceDraft: Boolean(draftId),
          requestId: draftId || undefined,
          publishingMode: review ? "manual_approval" : "automatic",
          targetPlatforms: selectedPlatforms,
          accountIds: targets.map((t) => t.social_account_id),
          mediaAssetId: mediaAssetId || null,
          variants: postVariants,
          postVariants: postVariants,
          postTargets: isDraft ? [] : targets,
          scheduledFor: customSchedule ? new Date(scheduledDateTime).toISOString() : null,
          weeklyOccurrences: customSchedule && !review ? weeklyOccurrences : 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save post");

      // For instant publishing, trigger the live publish dispatch immediately
      if (!isDraft && !customSchedule && !review && data.post?.id) {
        await fetch("/api/publish/now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: data.post.id }),
        }).catch((err) => console.warn("Background publish dispatch:", err));
      }

      toast.success(
        isDraft ? "Draft saved" : customSchedule ? "Post scheduled" : "Post published across all channels",
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
    <div className="space-y-6">
      {/* Upload Progress Bar if active */}
      {uploadProgress !== null && (
        <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            <span>Uploading media ({uploadProgress}%)...</span>
            <button type="button" onClick={() => uploadRequest.current?.abort()} className="underline hover:text-foreground">
              Cancel
            </button>
          </div>
          <div className="h-1.5 w-full bg-indigo-100 dark:bg-indigo-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Header with Title and Mobile Step Wizard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Create Post
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select channels, upload media, craft captions, and publish or schedule.
          </p>
        </div>

        {/* Mobile Step Navigator */}
        <div className="flex xl:hidden items-center p-1 rounded-lg bg-muted border border-border text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMobileStep(1)}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all text-center",
              mobileStep === 1 ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            1. Channels &amp; Media
          </button>
          <button
            type="button"
            onClick={() => setMobileStep(2)}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all text-center",
              mobileStep === 2 ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            2. Content &amp; AI
          </button>
          <button
            type="button"
            onClick={() => setMobileStep(3)}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all text-center",
              mobileStep === 3 ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            3. Preview &amp; Publish
          </button>
        </div>
      </div>

      {/* 3-Column Desktop Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        
        {/* ======================================================== */}
        {/* COLUMN 1: Channels & Scheduling (3 cols / 25%)           */}
        {/* ======================================================== */}
        <div className={cn("xl:col-span-3 space-y-4", mobileStep !== 1 && "hidden xl:block")}>
          {/* Channels Selection */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-xs font-semibold text-foreground">
                Channels
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {selectedPlatforms.length} of {PLATFORMS.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const isConnected = connectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between group",
                      isSelected
                        ? "border-indigo-600/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-foreground"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-md bg-background border border-border/80 shrink-0 flex items-center justify-center p-1">
                        <PlatformIcon platform={platform.id} className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <span>{platform.name}</span>
                          {isConnected ? (
                            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Connected" />
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">(Offline)</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{platform.tag}</p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "size-4 rounded flex items-center justify-center border transition-colors shrink-0",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-border bg-background"
                      )}
                    >
                      {isSelected && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Offline Destination Alert */}
            {selectedPlatforms.some((p) => !connectedPlatforms.includes(p)) && (
              <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <p>A selected channel is not connected yet.</p>
                <Link href="/dashboard/accounts" className="font-semibold underline block hover:text-foreground">
                  Connect channel in Accounts →
                </Link>
              </div>
            )}
          </div>

          {/* Account Multi-Selection */}
          {accounts.filter((a) => selectedPlatforms.includes(a.platform)).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <h2 className="text-xs font-semibold text-foreground pb-2 border-b border-border">
                Connected Profiles
              </h2>
              <div className="space-y-1.5">
                {accounts
                  .filter((a) => selectedPlatforms.includes(a.platform))
                  .map((account) => (
                    <label
                      key={account.id}
                      className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1.5 rounded-md transition-colors"
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
                      <PlatformIcon platform={account.platform} className="size-3.5 shrink-0" />
                      <span className="truncate font-medium">{account.account_name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Scheduling Options */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                <span>Schedule Release</span>
              </span>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="size-4 rounded border-border text-indigo-600 cursor-pointer"
              />
            </div>

            {isScheduled && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Date &amp; Time (Local)</label>
                  <Input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="text-xs font-mono rounded-lg h-8"
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
                      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
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

          {/* Mobile Continue Button */}
          <div className="xl:hidden pt-2">
            <Button
              type="button"
              variant="stitch"
              onClick={() => setMobileStep(2)}
              className="w-full h-10 text-xs font-medium gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <span>Continue to Content</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2: Media, Content & AI Assistant (5 cols / 45%)   */}
        {/* ======================================================== */}
        <div className={cn("xl:col-span-5 space-y-4", mobileStep !== 2 && "hidden xl:block")}>
          {/* Media Upload & Preview */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
            {/* Hidden Input Refs for Explicit Photo vs Video Triggers */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) chooseFile(f);
                e.target.value = "";
              }}
              className="sr-only"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) chooseFile(f);
                e.target.value = "";
              }}
              className="sr-only"
            />

            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="space-y-0.5">
                <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>Media Asset</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({mediaPreview ? (isVideo ? "Video File" : "Photo File") : "Choose Photo or Video"})
                  </span>
                </h2>
              </div>
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

            {/* Explicit Choice: Photo Card vs Video Card */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all flex flex-col justify-between group cursor-pointer relative",
                  mediaPreview && !isVideo
                    ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-600/50"
                    : "border-border hover:border-indigo-400/60 bg-background hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="size-7 rounded-md bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <ImageIcon className="size-4" />
                  </div>
                  {mediaPreview && !isVideo ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Attached
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Photo</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Upload Photo</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    JPEG, PNG, WebP
                  </p>
                  <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                    Instagram • Facebook • LinkedIn
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all flex flex-col justify-between group cursor-pointer relative",
                  mediaPreview && isVideo
                    ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-600/50"
                    : "border-border hover:border-indigo-400/60 bg-background hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="size-7 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Video className="size-4" />
                  </div>
                  {mediaPreview && isVideo ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Attached
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Video</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Upload Video</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    MP4, QuickTime, WebM
                  </p>
                  <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium mt-1">
                    YouTube Only Video • Reels • All
                  </p>
                </div>
              </button>
            </div>

            {/* Media Preview or Drag & Drop Zone */}
            {mediaPreview ? (
              <div className="relative rounded-lg border border-border overflow-hidden bg-muted/20">
                {isVideo ? (
                  <video
                    src={mediaPreview}
                    controls
                    onLoadedMetadata={(e) => {
                      const sec = e.currentTarget.duration;
                      if (Number.isFinite(sec)) setDuration(Math.round(sec));
                    }}
                    className="w-full max-h-56 object-contain bg-black/70"
                  />
                ) : (
                  <img src={mediaPreview} alt="Attached asset" className="w-full max-h-56 object-contain mx-auto" />
                )}
                <div className="p-2.5 bg-card border-t border-border flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-mono text-[11px] text-foreground font-medium truncate max-w-[220px]">
                      {selectedFile?.name || (isVideo ? "Video Asset" : "Photo Asset")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isVideo ? `Video • ${duration !== undefined ? `${duration}s • ` : ""}YouTube & Socials Ready` : "Photo • 1080p Standard Format"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => (isVideo ? videoInputRef.current?.click() : photoInputRef.current?.click())}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                    >
                      <UploadCloud className="size-3.5" /> Replace
                    </button>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                    >
                      <X className="size-3.5" /> Remove
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
                className="border-2 border-dashed border-border hover:border-indigo-500/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center space-y-1.5 bg-muted/20 hover:bg-muted/40"
              >
                <div className="size-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                  <UploadCloud className="size-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Or drag &amp; drop any photo or video here</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Images up to 15MB • Videos up to 100MB (MP4/WebM)
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

            {/* Platform Media Readiness Status Panel */}
            <div className="p-3 rounded-lg border border-border bg-muted/25 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">Platform Media Compatibility:</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {mediaPreview ? (isVideo ? "Video Mode (YouTube & All Channels)" : "Photo Mode (Social Channels)") : "No Media (Text-Only Mode)"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                {/* LinkedIn */}
                <div className="p-1.5 rounded-md border border-border/80 bg-background flex items-center justify-between">
                  <span className="font-medium text-foreground">LinkedIn</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="size-3" /> {mediaPreview ? (isVideo ? "Video" : "Photo") : "Text"}
                  </span>
                </div>

                {/* Facebook */}
                <div className="p-1.5 rounded-md border border-border/80 bg-background flex items-center justify-between">
                  <span className="font-medium text-foreground">Facebook</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="size-3" /> {mediaPreview ? (isVideo ? "Video" : "Photo") : "Text"}
                  </span>
                </div>

                {/* Instagram */}
                <div className="p-1.5 rounded-md border border-border/80 bg-background flex items-center justify-between">
                  <span className="font-medium text-foreground">Instagram</span>
                  {mediaPreview ? (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="size-3" /> {isVideo ? "Reel" : "Photo"}
                    </span>
                  ) : (
                    <span className="font-mono text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <AlertCircle className="size-3" /> Need media
                    </span>
                  )}
                </div>

                {/* YouTube */}
                <div className={cn(
                  "p-1.5 rounded-md border flex items-center justify-between",
                  isVideo
                    ? "border-emerald-300 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20"
                    : mediaPreview
                    ? "border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20"
                    : "border-border/80 bg-background"
                )}>
                  <span className="font-medium text-foreground">YouTube</span>
                  {isVideo ? (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="size-3" /> Video OK
                    </span>
                  ) : (
                    <span className="font-mono text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <AlertCircle className="size-3" /> Video only
                    </span>
                  )}
                </div>
              </div>

              {/* YouTube Photo Conversion Action Banner */}
              {selectedPlatforms.includes("youtube") && mediaPreview && !isVideo && (
                <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-2 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-semibold block text-amber-950 dark:text-amber-100">
                        YouTube requires a video file.
                      </span>
                      Static photos cannot be published directly to YouTube. Convert your photo into a 1080p MP4 video with 1 click:
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isConvertingVideo}
                    onClick={() => void handleConvertToVideo()}
                    className="w-full h-8 text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                  >
                    <Video className="size-3.5" />
                    <span>{isConvertingVideo ? "Converting to 1080p MP4..." : "Convert Photo to 1080p MP4 Video for YouTube"}</span>
                  </Button>
                </div>
              )}

              {/* Photo Formatting Helpers */}
              {mediaPreview && !isVideo && (
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Standard 1080p formatting:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleAutoFormatPhoto("jpeg")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer",
                        targetPhotoFormat === "jpeg" ? "bg-indigo-600 text-white border-indigo-600" : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      JPEG 1080p
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAutoFormatPhoto("png")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer",
                        targetPhotoFormat === "png" ? "bg-indigo-600 text-white border-indigo-600" : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      PNG 1080p
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Generation Prompt Bar */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI Assistant</span>
              </h2>
              <div className="flex items-center gap-1">
                {(["English", "Tamil", "Tanglish"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      language === lang ? "bg-foreground text-background font-semibold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Topic, angle, or core message (e.g. New feature launch, founder lesson)..."
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                className="text-xs rounded-lg h-9"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as SupportedTone)}
                    className="w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground"
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
                    className="w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground"
                  >
                    <option value="detailed">Large / In-Depth Story (300-500 words)</option>
                    <option value="standard">Standard / Multi-Paragraph (180-280 words)</option>
                    <option value="short">Short & Punchy (70-120 words)</option>
                  </select>
                </div>
              </div>

              <Button
                type="button"
                variant="stitch"
                onClick={() => void handleGenerateAI()}
                disabled={isGenerating}
                className="w-full text-xs font-medium gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Sparkles className="size-3.5" />
                <span>{isGenerating ? "Generating..." : "Generate Captions & Titles"}</span>
              </Button>
            </div>
          </div>

          {/* Caption & Hashtags Editor */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
            {/* Channel Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                {selectedPlatforms.map((p) => {
                  const isActive = activeTab === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActiveTab(p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors shrink-0",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <PlatformIcon platform={p} className="size-3.5" />
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                {currentContent.caption.length}/{currentPlatformMeta.maxChars}
              </span>
            </div>

            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                {activeTab === "youtube" ? "Video Title (Required for YouTube)" : "Post Headline (Optional)"}
              </label>
              <Input
                placeholder={activeTab === "youtube" ? "E.g. How to Automate Social Media Publishing" : "Catchy headline"}
                value={currentContent.title || ""}
                onChange={(e) => updateCurrentTitle(e.target.value)}
                maxLength={100}
                className="text-xs rounded-lg h-8"
              />
            </div>

            {/* Caption Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-foreground">
                  {activeTab === "youtube" ? "Video Description" : "Caption"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowMentionBar(!showMentionBar)}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <AtSign className="size-3" />
                  <span>Mention</span>
                </button>
              </div>

              {/* Quick Mention Input */}
              {showMentionBar && (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <Input
                    placeholder="Enter handle (e.g. vercel)..."
                    value={mentionInput}
                    onChange={(e) => setMentionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMention(mentionInput);
                      }
                    }}
                    className="h-7 text-xs rounded-md"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddMention(mentionInput)}
                    className="h-7 text-[10px] px-2.5 rounded-md"
                  >
                    Add
                  </Button>
                </div>
              )}

              <Textarea
                placeholder="Write your post caption..."
                rows={5}
                value={currentContent.caption}
                onChange={(e) => updateCurrentCaption(e.target.value)}
                className="text-xs rounded-lg resize-none font-sans leading-relaxed"
              />

              {/* Quick Emoji Toolbar */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto custom-scrollbar">
                <Smile className="size-3 text-muted-foreground shrink-0 mr-1" />
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="size-6 rounded hover:bg-muted/80 flex items-center justify-center text-xs transition-colors shrink-0"
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Hashtags Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                Hashtags
              </label>
              <Input
                placeholder="#marketing #buildinpublic #saas"
                value={currentContent.hashtags || ""}
                onChange={(e) => updateCurrentHashtags(e.target.value)}
                className="text-xs rounded-lg h-8 font-mono"
              />
            </div>
          </div>

          {/* Mobile Navigation Buttons */}
          <div className="xl:hidden flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileStep(1)}
              className="flex-1 h-9 text-xs font-medium gap-1"
            >
              <ChevronLeft className="size-4" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              variant="stitch"
              onClick={() => setMobileStep(3)}
              className="flex-1 h-9 text-xs font-medium gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <span>Preview Post</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3: Live Post Mockup & Actions (4 cols / 30%)     */}
        {/* ======================================================== */}
        <div className={cn("xl:col-span-4 space-y-4 xl:sticky xl:top-20", mobileStep !== 3 && "hidden xl:block")}>
          {/* Live Preview Box */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Eye className="size-3.5 text-muted-foreground" />
                <span>Live Preview</span>
              </h2>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">
                {activeTab} Feed
              </span>
            </div>

            {/* Channel Mockup Tab Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {selectedPlatforms.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActiveTab(p)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium capitalize flex items-center gap-1.5 border transition-colors shrink-0",
                    activeTab === p
                      ? "border-indigo-600/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <PlatformIcon platform={p} className="size-3" />
                  <span>{p}</span>
                </button>
              ))}
            </div>

            {/* Embedded Realistic Social Preview */}
            <div className="max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
              <SocialMediaLivePreview
                platform={activeTab}
                caption={currentContent.caption}
                hashtags={currentContent.hashtags}
                title={currentContent.title}
                mediaUrl={mediaPreview}
                isVideo={isVideo}
                authorName={previewAccount?.account_name || "SocialSync Creator"}
                authorHandle={previewAccount?.account_handle || "socialsync_ai"}
                authorAvatar={previewAccount?.avatar_url}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <Button
              type="button"
              variant="stitch"
              disabled={isPublishing || isGenerating}
              onClick={() => void handleSubmit(false)}
              className="w-full h-10 text-xs font-semibold gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Send className="size-3.5" />
              <span>
                {isPublishing
                  ? "Publishing..."
                  : isScheduled
                  ? "Schedule Post"
                  : "Publish Now"}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPublishing || isGenerating}
              onClick={() => void handleSubmit(true)}
              className="w-full h-8 text-xs font-medium gap-1.5 rounded-lg border-border"
            >
              <Save className="size-3.5 text-muted-foreground" />
              <span>Save as Draft</span>
            </Button>
          </div>

          {/* Mobile Back Button */}
          <div className="xl:hidden pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileStep(2)}
              className="w-full h-9 text-xs font-medium gap-1"
            >
              <ChevronLeft className="size-4" />
              <span>Back to Content</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
