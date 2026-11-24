"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Send,
  Eye,
  FileText,
  Sliders,
  Languages,
  CheckCircle2,
  Cpu,
  Layers,
  Terminal,
  Globe,
  SlidersHorizontal,
  Bookmark,
  Trash2,
  ExternalLink,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GeminiAnalysisResult, SupportedLanguage, SupportedTone, SocialPlatform } from "@/types";
import { prepareMediaPreview } from "@/lib/ai/media-preview";
import { TrendResearch } from "@/components/dashboard/trend-research";
import { PlatformIcon } from "@/components/platform-icon";
import { cn } from "@/lib/utils";

const EDITORIAL_PRESETS = [
  { label: "SaaS Launch Announcement", icon: Cpu, prompt: "Autonomous Multi-Platform Social Media Automation Architecture and System Launch", tone: "Professional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Product Feature Release", icon: Layers, prompt: "Major Product Milestone Release and Next-Gen Engineering Platform Overview", tone: "Promotional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Workflow Efficiency Tip", icon: SlidersHorizontal, prompt: "Eliminating Multi-Channel Content Distribution Bottlenecks via Automated Orchestration", tone: "Creative" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Bilingual Tanglish Overview", icon: Globe, prompt: "Multi-platform content distribution-la irukkura manual work-ah simplify panna oru comprehensive system", tone: "Friendly" as SupportedTone, lang: "Tanglish" as SupportedLanguage },
];

interface SavedSnippet {
  id: string;
  timestamp: string;
  platform: SocialPlatform;
  title?: string;
  caption: string;
  hashtags: string;
}

export default function AICaptionStudioPage() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [userPrompt, setUserPrompt] = React.useState("");
  const [language, setLanguage] = React.useState<SupportedLanguage>("English");
  const [tone, setTone] = React.useState<SupportedTone>("Professional");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<GeminiAnalysisResult | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [activePlatformTab, setActivePlatformTab] = React.useState<SocialPlatform>("instagram");
  const [savedHistory, setSavedHistory] = React.useState<SavedSnippet[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);

  // Load saved history from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("socialsync_saved_captions");
      if (stored) setSavedHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file || isGenerating) return;
    e.currentTarget.value = "";
    setAnalysisResult(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!file.type.startsWith("video/")) void handleGenerate(file);
  };

  const handleSelectPreset = (preset: typeof EDITORIAL_PRESETS[0]) => {
    setUserPrompt(preset.prompt);
    setTone(preset.tone);
    if (preset.lang) setLanguage(preset.lang);
    toast.info(`Applied preset: ${preset.label}`);
  };

  const handleGenerate = async (attachedPhoto?: File) => {
    setIsGenerating(true);
    const notice = toast.loading("Generating multi-platform copy with SocialSync AI...");

    try {
      const file = attachedPhoto ?? selectedFile;
      const media = file ? await prepareMediaPreview(file, file.type.startsWith("video/")) : {};

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: attachedPhoto ? undefined : userPrompt.trim() || undefined,
          language,
          tone,
          ...media,
          alternatives: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");

      setAnalysisResult(json.data);
      const provider = json.source || "Gemini 3.5 Flash-Lite";
      toast.success(`Captions and titles generated via ${provider}!`, { id: notice });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate captions and titles", { id: notice });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Content copied to clipboard!");
  };

  const saveToHistory = (platform: SocialPlatform, caption: string, hashtags: string[], title?: string) => {
    const tags = hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    const snippet: SavedSnippet = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      platform,
      title,
      caption,
      hashtags: tags,
    };
    const updated = [snippet, ...savedHistory.slice(0, 19)];
    setSavedHistory(updated);
    try {
      localStorage.setItem("socialsync_saved_captions", JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast.success("Saved to Studio History!");
  };

  const deleteSavedSnippet = (id: string) => {
    const updated = savedHistory.filter((s) => s.id !== id);
    setSavedHistory(updated);
    try {
      localStorage.setItem("socialsync_saved_captions", JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast.info("Item removed from history.");
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-500 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
              AI Content Studio
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[11px] font-mono text-muted-foreground">Gemini 3.5 Flash-Lite</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Omnichannel Copy &amp; Title Generator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate viral short-form hooks, platform-tailored copy, hashtags, and YouTube titles in seconds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-1.5 text-xs rounded-xl h-9"
          >
            <History className="h-3.5 w-3.5 text-indigo-500" />
            <span>Saved History ({savedHistory.length})</span>
          </Button>

          <Link href="/dashboard/create-post">
            <Button variant="stitch" size="sm" className="gap-2 text-xs rounded-xl h-9 shadow-md shadow-indigo-500/20">
              <Send className="h-3.5 w-3.5" />
              <span>Open Composer</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Real-Time Trends Integration */}
      <TrendResearch />

      {/* Editorial Presets */}
      <Card className="rounded-2xl border-border/70 bg-card p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground shrink-0">
            Curated Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {EDITORIAL_PRESETS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/80 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors shadow-2xs"
                >
                  <Icon className="h-3 w-3 text-indigo-500" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Saved History Drawer / Panel */}
      {showHistory && (
        <Card className="rounded-2xl border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20 p-4 shadow-sm animate-in fade-in space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Saved Snippet History
              </h2>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
            >
              Close
            </button>
          </div>

          {savedHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No saved snippets yet. Click &ldquo;Save Snippet&rdquo; on any generated platform copy below.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {savedHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-border/80 bg-card space-y-2 text-xs relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 capitalize font-semibold text-foreground">
                      <PlatformIcon platform={item.platform} className="h-3.5 w-3.5" />
                      <span>{item.platform}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.timestamp}</span>
                  </div>
                  {item.title && <p className="font-semibold text-foreground line-clamp-1">{item.title}</p>}
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">{item.caption}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${item.title ? item.title + "\n\n" : ""}${item.caption}\n\n${item.hashtags}`, item.id)}
                      className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedKey === item.id ? "Copied!" : "Copy"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedSnippet(item.id)}
                      className="text-rose-500 hover:text-rose-600 p-1"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (4 cols): Studio Controls */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="rounded-2xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Studio Controls &amp; Context
              </CardTitle>
              <CardDescription className="text-xs text-foreground font-medium pt-0.5">
                Attach visuals or provide editorial direction for Gemini 3.5.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <label
                htmlFor="studio-file-upload"
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center cursor-pointer transition-colors",
                  previewUrl ? "border-indigo-500/60 bg-indigo-500/5" : "border-border/80 hover:bg-muted/40"
                )}
              >
                <input
                  id="studio-file-upload"
                  type="file"
                  disabled={isGenerating}
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {previewUrl ? (
                  <div className="w-full space-y-2">
                    {selectedFile?.type.startsWith("video/") ? (
                      <video src={previewUrl} controls playsInline aria-label="Video preview" className="max-h-40 w-full rounded-lg object-contain" />
                    ) : (
                      <img src={previewUrl} alt="Studio Preview" className="max-h-40 w-full rounded-lg object-contain" />
                    )}
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold block">
                      Replace Asset
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-3">
                    <Upload className="mx-auto h-5 w-5 text-indigo-500" />
                    <p className="text-xs font-semibold text-foreground">Attach Photo or Video</p>
                    <p className="text-[10px] text-muted-foreground font-mono">JPG, PNG, WebP, MP4</p>
                  </div>
                )}
              </label>

              <div className="space-y-1.5">
                <label htmlFor="caption-context" className="text-xs font-semibold text-foreground">
                  Context / Topic Prompt
                </label>
                <Textarea
                  id="caption-context"
                  placeholder="E.g., Announcing our new SaaS pricing tiers and automated YouTube publishing..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={3}
                  className="text-xs rounded-xl resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">Language:</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                    className="w-full rounded-xl border border-input bg-background p-1.5 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Tanglish">Tanglish</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">Tone:</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as SupportedTone)}
                    className="w-full rounded-xl border border-input bg-background p-1.5 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Viral-style">Viral-style</option>
                    <option value="Creative">Creative</option>
                    <option value="Educational">Educational</option>
                    <option value="Promotional">Promotional</option>
                  </select>
                </div>
              </div>

              <Button
                variant="stitch"
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
                className="w-full gap-2 text-xs h-10 rounded-xl font-semibold shadow-md shadow-indigo-500/20"
              >
                <Sparkles className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                <span>{isGenerating ? "Synthesizing Copy..." : "Generate Social Captions"}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Visual Analysis Metadata Card */}
          {analysisResult && (
            <Card className="rounded-2xl border-border/70 bg-card p-4 space-y-3 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Eye className="h-3.5 w-3.5 text-indigo-500" />
                <h3 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Multimodal Visual Insights
                </h3>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground font-semibold text-[11px]">Visual Summary:</span>
                  <p className="text-foreground mt-0.5 leading-relaxed">{analysisResult.summary}</p>
                </div>
                {analysisResult.extracted_text && (
                  <div>
                    <span className="text-muted-foreground font-semibold text-[11px]">OCR Extracted Text:</span>
                    <p className="text-foreground font-mono bg-muted/40 p-2 rounded-lg mt-0.5 text-[10px] border border-border/60">
                      {analysisResult.extracted_text}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground font-semibold text-[11px]">Detected Topics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(analysisResult.topics || []).map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-mono rounded-md">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (8 cols): Platform Output Studio */}
        <div className="space-y-4 lg:col-span-8">
          <Card className="rounded-2xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Generated Omnichannel Variations
                  </CardTitle>
                  <CardDescription className="text-xs text-foreground font-medium pt-0.5">
                    Tailored copy, hooks, and hashtags for Instagram, LinkedIn, Facebook, and YouTube.
                  </CardDescription>
                </div>

                {analysisResult && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating}
                    className="h-8 text-xs gap-1.5 rounded-xl border-border/80"
                  >
                    <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                    <span>Regenerate</span>
                  </Button>
                )}
              </div>

              {/* Platform Output Tab Buttons */}
              <div className="flex items-center gap-1.5 pt-3 overflow-x-auto custom-scrollbar">
                {(["instagram", "facebook", "linkedin", "youtube"] as SocialPlatform[]).map((p) => {
                  const isActive = activePlatformTab === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePlatformTab(p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0",
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
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {analysisResult ? (
                (() => {
                  const variant = analysisResult.platforms[activePlatformTab];
                  if (!variant) {
                    return (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No copy generated for this channel. Click Regenerate to build one.
                      </div>
                    );
                  }

                  const tags = (variant.hashtags || []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
                  const fullCopy = [variant.title ? `[${variant.title}]\n` : "", variant.caption, tags].filter(Boolean).join("\n\n");

                  return (
                    <div className="space-y-4 animate-in fade-in">
                      {/* Title display */}
                      {variant.title && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Suggested Title / Headline
                          </label>
                          <div className="p-2.5 rounded-xl border border-border/80 bg-background font-semibold text-xs text-foreground flex items-center justify-between">
                            <span>{variant.title}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(variant.title || "", "title")}
                              className="text-muted-foreground hover:text-foreground p-1"
                              title="Copy title"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Caption display */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Optimized Caption Body
                          </label>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {variant.caption.length} characters
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl border border-border/80 bg-background text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                          {variant.caption}
                        </div>
                      </div>

                      {/* Hashtags display */}
                      {variant.hashtags && variant.hashtags.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Hashtags ({variant.hashtags.length})
                          </label>
                          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border/80 bg-background">
                            {variant.hashtags.map((h, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md"
                              >
                                {h.startsWith("#") ? h : `#${h}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Call to action & rationale */}
                      {variant.rationale && (
                        <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-muted-foreground space-y-1">
                          <span className="font-semibold text-foreground text-[11px]">Editorial Rationale:</span>
                          <p className="leading-relaxed">{variant.rationale}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(fullCopy, "full")}
                            className="text-xs h-9 gap-1.5 rounded-xl border-border/80"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span>{copiedKey === "full" ? "Copied All!" : "Copy Full Post"}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveToHistory(activePlatformTab, variant.caption, variant.hashtags || [], variant.title)}
                            className="text-xs h-9 gap-1.5 rounded-xl border-border/80"
                          >
                            <Bookmark className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Save Snippet</span>
                          </Button>
                        </div>

                        <Link href="/dashboard/create-post">
                          <Button size="sm" variant="stitch" className="text-xs h-9 gap-1.5 rounded-xl shadow-md shadow-indigo-500/20">
                            <span>Use in Composer</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-20 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">AI Studio is ready</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Click &ldquo;Generate Social Captions&rdquo; or pick a preset to synthesize cross-platform titles, captions, and tags.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
