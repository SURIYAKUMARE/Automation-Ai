"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Video,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Sliders,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  Terminal,
  Cpu,
  FileCheck2,
  Hash,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SocialPlatform, SupportedLanguage, SupportedTone } from "@/types";

interface PlatformVariantDraft {
  platform: SocialPlatform;
  caption: string;
  title?: string;
  hashtags: string[];
  callToAction?: string;
  isApproved: boolean;
}

const TOPIC_PRESETS = [
  { label: "Enterprise AI Architecture", icon: Cpu, prompt: "Autonomous Multi-Platform Social Media Automation Architecture and System Launch", tone: "Professional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Product Milestone Release", icon: Layers, prompt: "Major Product Milestone Release and Next-Gen Engineering Platform Overview", tone: "Promotional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Distribution Efficiency", icon: Sliders, prompt: "Eliminating Multi-Channel Content Distribution Bottlenecks via Automated Orchestration", tone: "Creative" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Engineering Demonstration", icon: Terminal, prompt: "Final Year Computer Science Major Project Demonstration: SocialSync AI", tone: "Professional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Bilingual Tanglish Overview", icon: Globe, prompt: "Multi-platform content distribution-la irukkura manual work-ah simplify panna oru comprehensive system", tone: "Friendly" as SupportedTone, lang: "Tanglish" as SupportedLanguage },
];

const PLATFORM_CONFIGS: Record<SocialPlatform, { name: string; maxChars: number; supportsTitle: boolean; mediaNote: string }> = {
  linkedin: { name: "LinkedIn", maxChars: 3000, supportsTitle: false, mediaNote: "Images (JPEG, PNG) or MP4 video" },
  instagram: { name: "Instagram", maxChars: 2200, supportsTitle: false, mediaNote: "JPEG/PNG (4:5 to 1.91:1) or Reels MP4" },
  facebook: { name: "Facebook", maxChars: 5000, supportsTitle: false, mediaNote: "Direct image, video, or text feed" },
  youtube: { name: "YouTube", maxChars: 5000, supportsTitle: true, mediaNote: "MP4/MOV video upload required" },
};

export default function CreatePostPage() {
  const router = useRouter();

  // Media state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = React.useState<string | null>(null);
  const [isVideo, setIsVideo] = React.useState(false);
  const [mediaAssetId, setMediaAssetId] = React.useState<string | null>(null);

  // AI Configuration
  const [userPrompt, setUserPrompt] = React.useState("");
  const [language, setLanguage] = React.useState<SupportedLanguage>("English");
  const [tone, setTone] = React.useState<SupportedTone>("Professional");
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<SocialPlatform[]>([
    "linkedin",
    "instagram",
    "facebook",
  ]);

  // Mode and Scheduling
  const [publishingMode, setPublishingMode] = React.useState<"automatic" | "manual_approval">("manual_approval");
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [scheduledDateTime, setScheduledDateTime] = React.useState("");

  // Platform Variants
  const [variants, setVariants] = React.useState<Record<SocialPlatform, PlatformVariantDraft>>({
    linkedin: {
      platform: "linkedin",
      caption: "",
      hashtags: [],
      isApproved: false,
    },
    instagram: {
      platform: "instagram",
      caption: "",
      hashtags: [],
      isApproved: false,
    },
    facebook: {
      platform: "facebook",
      caption: "",
      hashtags: [],
      isApproved: false,
    },
    youtube: {
      platform: "youtube",
      title: "",
      caption: "",
      hashtags: [],
      isApproved: false,
    },
  });

  const [activeTab, setActiveTab] = React.useState<SocialPlatform>("linkedin");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copiedPlatform, setCopiedPlatform] = React.useState<string | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const isVid = file.type.startsWith("video/");
    setIsVideo(isVid);

    if (isVid && !selectedPlatforms.includes("youtube")) {
      setSelectedPlatforms((prev) => [...prev, "youtube"]);
    }

    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);
    toast.success(`Attached ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  // Toggle platform
  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  // Trigger Gemini AI Generation
  const handleGenerateCaptions = async () => {
    setIsGenerating(true);
    toast.info("Gemini multimodal analysis initialized...");

    try {
      let mediaBase64: string | undefined;
      let mimeType: string | undefined;

      if (selectedFile) {
        mimeType = selectedFile.type;
        const reader = new FileReader();
        mediaBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt,
          language,
          tone,
          mediaBase64,
          mimeType,
          isMediaVideo: isVideo,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");

      const aiData = json.data;
      const newVariants = { ...variants };

      if (aiData.platforms.linkedin) {
        newVariants.linkedin = {
          platform: "linkedin",
          caption: aiData.platforms.linkedin.caption,
          hashtags: aiData.platforms.linkedin.hashtags || [],
          callToAction: aiData.platforms.linkedin.call_to_action,
          isApproved: false,
        };
      }
      if (aiData.platforms.instagram) {
        newVariants.instagram = {
          platform: "instagram",
          caption: aiData.platforms.instagram.caption,
          hashtags: aiData.platforms.instagram.hashtags || [],
          callToAction: aiData.platforms.instagram.call_to_action,
          isApproved: false,
        };
      }
      if (aiData.platforms.facebook) {
        newVariants.facebook = {
          platform: "facebook",
          caption: aiData.platforms.facebook.caption,
          hashtags: aiData.platforms.facebook.hashtags || [],
          callToAction: aiData.platforms.facebook.call_to_action,
          isApproved: false,
        };
      }
      if (aiData.platforms.youtube) {
        newVariants.youtube = {
          platform: "youtube",
          title: aiData.platforms.youtube.title || "SocialSync AI System Demo",
          caption: aiData.platforms.youtube.caption,
          hashtags: aiData.platforms.youtube.hashtags || [],
          callToAction: aiData.platforms.youtube.call_to_action,
          isApproved: false,
        };
      }

      setVariants(newVariants);
      toast.success("Platform captions synthesized with clean typographic formatting.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate captions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCaption = (platform: SocialPlatform) => {
    const v = variants[platform];
    const full = v.caption + (v.hashtags.length > 0 ? `\n\n${v.hashtags.join(" ")}` : "");
    navigator.clipboard.writeText(full);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
    toast.success(`Copied ${PLATFORM_CONFIGS[platform].name} content to clipboard.`);
  };

  const handleSubmitPost = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one destination platform.");
      return;
    }

    for (const p of selectedPlatforms) {
      if (!variants[p].caption.trim()) {
        toast.error(`Please provide or generate a caption for ${PLATFORM_CONFIGS[p].name}.`);
        setActiveTab(p);
        return;
      }
    }

    if (isScheduled && !scheduledDateTime) {
      toast.error("Specify a valid target date and time for scheduled execution.");
      return;
    }

    setIsSubmitting(true);
    toast.loading("Initiating media asset storage and publishing pipeline...");

    try {
      let uploadedAssetId = mediaAssetId;

      if (selectedFile && !uploadedAssetId) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("userId", "00000000-0000-0000-0000-000000000001");

        const uploadRes = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error || "Media storage upload failed");
        uploadedAssetId = uploadJson.asset?.id;
        setMediaAssetId(uploadedAssetId);
      }

      const variantPayload = selectedPlatforms.map((p) => ({
        platform: p,
        caption: variants[p].caption,
        title: variants[p].title || undefined,
        hashtags: variants[p].hashtags,
        callToAction: variants[p].callToAction,
        language,
        tone,
        isApproved: publishingMode === "automatic" ? true : variants[p].isApproved,
      }));

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "00000000-0000-0000-0000-000000000001",
          title: userPrompt ? userPrompt.substring(0, 80) : "SocialSync Campaign Post",
          mediaAssetId: uploadedAssetId || undefined,
          rawPrompt: userPrompt,
          publishingMode,
          scheduledFor: isScheduled ? new Date(scheduledDateTime).toISOString() : undefined,
          targetPlatforms: selectedPlatforms,
          variants: variantPayload,
        }),
      });

      const postJson = await res.json();
      if (!res.ok) throw new Error(postJson.error || "Post creation failed");

      toast.dismiss();

      if (publishingMode === "automatic" && !isScheduled) {
        toast.success("Broadcast executed successfully across connected channels.");
        router.push("/dashboard/history");
      } else if (isScheduled) {
        toast.success("Campaign scheduled successfully in execution queue.");
        router.push("/dashboard/calendar");
      } else {
        toast.success("Post submitted to Approval Center for review.");
        router.push("/dashboard/approvals");
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest uppercase text-indigo-400 font-semibold">
              Campaign Pipeline
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[11px] font-mono text-muted-foreground">Stitch Enterprise UI</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Create Multi-Platform Campaign
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Synchronized multimodal media ingestion, contextual caption generation, and multi-network dispatch.
          </p>
        </div>

        {/* Stitch Mode Selector */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setPublishingMode("manual_approval")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              publishingMode === "manual_approval"
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Manual Approval</span>
          </button>
          <button
            type="button"
            onClick={() => setPublishingMode("automatic")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              publishingMode === "automatic"
                ? "bg-indigo-600 text-white shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Fully Automatic</span>
          </button>
        </div>
      </div>

      {/* Pipeline Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-accent/20 p-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-[10px] font-bold">
            1
          </span>
          <span className="text-xs font-medium text-foreground">Media & Channels</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-accent/20 p-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-[10px] font-bold">
            2
          </span>
          <span className="text-xs font-medium text-foreground">Context Synthesis</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-accent/20 p-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-[10px] font-bold">
            3
          </span>
          <span className="text-xs font-medium text-foreground">Tailored Previews</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-accent/20 p-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-[10px] font-bold">
            4
          </span>
          <span className="text-xs font-medium text-foreground">Publish / Queue</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): Media Upload & AI Parameters */}
        <div className="space-y-6 lg:col-span-5">
          {/* SECTION 01: Media Upload Card */}
          <Card className="border-border/80">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
                  Section 01 / Ingestion
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Storage Bucket: media-assets
                </Badge>
              </div>
              <CardDescription className="text-xs text-foreground font-medium pt-1">
                Upload image, poster or video asset
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <label
                htmlFor="media-file-input"
                className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center cursor-pointer transition-colors ${
                  mediaPreview
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-slate-600 hover:bg-accent/30"
                }`}
              >
                <input
                  id="media-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {mediaPreview ? (
                  <div className="w-full space-y-3">
                    {isVideo ? (
                      <video src={mediaPreview} controls className="max-h-56 w-full rounded-lg object-contain bg-black/60" />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="max-h-56 w-full rounded-lg object-contain" />
                    )}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2 font-mono">
                      <span className="truncate max-w-[200px]">{selectedFile?.name}</span>
                      <span>{(selectedFile ? selectedFile.size / (1024 * 1024) : 0).toFixed(2)} MB</span>
                    </div>
                    <span className="text-[11px] text-primary hover:underline block">Replace file</span>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-medium text-foreground">Click or drag asset to attach</p>
                    <p className="text-[11px] text-muted-foreground font-mono">PNG, JPEG, WEBP, MP4 (max 100MB)</p>
                  </div>
                )}
              </label>

              {/* Destination Platforms Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-foreground">Target Destination Networks:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["linkedin", "instagram", "facebook", "youtube"] as SocialPlatform[]).map((p) => {
                    const isSelected = selectedPlatforms.includes(p);
                    const config = PLATFORM_CONFIGS[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                            : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <span className="capitalize">{config.name}</span>
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-border/80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 02: AI Synthesis Controls */}
          <Card className="border-border/80">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
                  Section 02 / AI Synthesis
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono text-indigo-400 border-indigo-500/30">
                  Gemini 1.5 Flash
                </Badge>
              </div>
              <CardDescription className="text-xs text-foreground font-medium pt-1">
                Contextual guidelines and language parameters
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Presets Grid */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                  Curated Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_PRESETS.map((preset, idx) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setUserPrompt(preset.prompt);
                          setTone(preset.tone);
                          if (preset.lang) setLanguage(preset.lang);
                          toast.info(`Loaded preset: ${preset.label}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-slate-600 transition-colors"
                      >
                        <Icon className="h-3 w-3 text-primary" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Context Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Theme & Contextual Notes:</label>
                <Textarea
                  placeholder="Provide context, event details, metrics, or announcements..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={3}
                  className="text-xs font-sans leading-relaxed"
                />
              </div>

              {/* Language and Tone Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Language Output:</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                    className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Tanglish">Tanglish</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Editorial Tone:</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as SupportedTone)}
                    className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Creative">Creative</option>
                    <option value="Minimal">Minimal</option>
                    <option value="Promotional">Promotional</option>
                  </select>
                </div>
              </div>

              <Button
                variant="stitch"
                onClick={handleGenerateCaptions}
                disabled={isGenerating}
                className="w-full gap-2 text-xs"
              >
                <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? "Synthesizing Captions..." : "Synthesize Platform Content"}</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (7 cols): Platform Previews & Dispatch */}
        <div className="space-y-6 lg:col-span-7">
          {/* SECTION 03: Platform Previews */}
          <Card className="border-border/80">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
                    Section 03 / Multi-Platform Captions
                  </CardTitle>
                  <CardDescription className="text-xs text-foreground font-medium pt-1">
                    Platform-specific editorial output and character limits
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCaption(activeTab)}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copiedPlatform === activeTab ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedPlatform === activeTab ? "Copied" : "Copy Content"}</span>
                </Button>
              </div>

              {/* Segmented Network Tabs */}
              <div className="flex gap-1.5 pt-3">
                {selectedPlatforms.map((p) => {
                  const config = PLATFORM_CONFIGS[p];
                  const hasContent = variants[p].caption.trim().length > 0;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActiveTab(p)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        activeTab === p
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "bg-accent/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{config.name}</span>
                      {hasContent && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* YouTube Title */}
              {activeTab === "youtube" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <label>Video Title:</label>
                    <span className="font-mono text-muted-foreground">
                      {(variants.youtube.title || "").length} / 100 characters
                    </span>
                  </div>
                  <Input
                    placeholder="Enter precise YouTube video title..."
                    value={variants.youtube.title || ""}
                    onChange={(e) =>
                      setVariants({
                        ...variants,
                        youtube: { ...variants.youtube, title: e.target.value },
                      })
                    }
                    className="text-xs font-medium"
                  />
                </div>
              )}

              {/* Caption Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-foreground">
                    {PLATFORM_CONFIGS[activeTab].name} Formatted Copy:
                  </label>
                  <span className="text-muted-foreground font-mono">
                    {variants[activeTab].caption.length} / {PLATFORM_CONFIGS[activeTab].maxChars} chars
                  </span>
                </div>
                <Textarea
                  rows={9}
                  placeholder={`Write or synthesize ${PLATFORM_CONFIGS[activeTab].name} caption...`}
                  value={variants[activeTab].caption}
                  onChange={(e) =>
                    setVariants({
                      ...variants,
                      [activeTab]: { ...variants[activeTab], caption: e.target.value },
                    })
                  }
                  className="font-sans text-xs leading-relaxed"
                />
              </div>

              {/* Hashtags Input */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <span>Hashtags (Space Separated):</span>
                </div>
                <Input
                  placeholder="#Architecture #Automation #Engineering"
                  value={variants[activeTab].hashtags.join(" ")}
                  onChange={(e) =>
                    setVariants({
                      ...variants,
                      [activeTab]: {
                        ...variants[activeTab],
                        hashtags: e.target.value.split(" ").filter(Boolean),
                      },
                    })
                  }
                  className="text-xs font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 04: Delivery Dispatch */}
          <Card className="border-border/80">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
                  Section 04 / Dispatch Timeline
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Timezone: UTC
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border border-border/80 p-3 bg-card/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Scheduled Queue Execution
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Store job in persistent queue to be triggered at specified timestamp
                  </p>
                </div>
                <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
              </div>

              {isScheduled && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Publish Date & Time (UTC):</label>
                  <Input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t border-border/40 pt-4 flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="stitch"
                size="sm"
                onClick={handleSubmitPost}
                disabled={isSubmitting}
                className="w-full sm:w-auto gap-2 text-xs"
              >
                <Send className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
                <span>
                  {isSubmitting
                    ? "Dispatching..."
                    : isScheduled
                    ? "Schedule Campaign"
                    : publishingMode === "automatic"
                    ? "Publish to All Channels"
                    : "Submit to Approval Center"}
                </span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
