"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  Copy,
  RefreshCw,
  Send,
  Eye,
  Cpu,
  Layers,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GeminiAnalysisResult, SupportedLanguage, SupportedTone, SocialPlatform } from "@/types";
import { prepareMediaPreview } from "@/lib/ai/media-preview";
import { TrendResearch } from "@/components/dashboard/trend-research";
import { PlatformIcon } from "@/components/platform-icon";
import { cn } from "@/lib/utils";

const EDITORIAL_PRESETS = [
  { label: "Product Announcement", icon: Layers, prompt: "Excited to introduce our latest product update designed to help teams work faster and smarter.", tone: "Professional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Engineering Behind-The-Scenes", icon: Cpu, prompt: "A peek behind the scenes into how we solved our biggest technical challenge this sprint.", tone: "Professional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Actionable Growth Tip", icon: SlidersHorizontal, prompt: "3 simple, actionable tactics you can apply today to streamline your workflow and save 5 hours a week.", tone: "Creative" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Bilingual / Tanglish Community", icon: Globe, prompt: "Ungaloda daily workflow-ah simplify panna simple tips and insights.", tone: "Friendly" as SupportedTone, lang: "Tanglish" as SupportedLanguage },
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
    const notice = toast.loading("Generating captions and titles...");

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
      toast.success("Captions and titles generated successfully", { id: notice });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate captions", { id: notice });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Copied to clipboard");
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
    toast.success("Saved to history");
  };

  const deleteSavedSnippet = (id: string) => {
    const updated = savedHistory.filter((s) => s.id !== id);
    setSavedHistory(updated);
    try {
      localStorage.setItem("socialsync_saved_captions", JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast.info("Item removed from history");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            AI Content Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Write, tailor, and adapt copy, hashtags, and titles for Instagram, LinkedIn, Facebook, and YouTube.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-1.5 text-xs rounded-lg h-9 border-border"
          >
            <History className="size-3.5 text-muted-foreground" />
            <span>Saved History ({savedHistory.length})</span>
          </Button>

          <Link href="/dashboard/create-post">
            <Button size="sm" className="gap-1.5 text-xs rounded-lg h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <Send className="size-3.5" />
              <span>Open Composer</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Real-Time Trends Integration */}
      <TrendResearch />

      {/* Editorial Presets */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
            Quick Prompts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {EDITORIAL_PRESETS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted/70 px-2.5 py-1 text-xs text-foreground transition-colors"
                >
                  <Icon className="size-3 text-muted-foreground" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Saved History Drawer / Panel */}
      {showHistory && (
        <Card className="rounded-xl border border-border bg-muted/20 p-4 shadow-xs animate-in fade-in space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <History className="size-4 text-indigo-600" />
              <h2 className="text-xs font-semibold text-foreground">
                Saved Snippets
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
              No saved snippets yet. Click &ldquo;Save Snippet&rdquo; on any generated copy below.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {savedHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 capitalize font-semibold text-foreground">
                      <PlatformIcon platform={item.platform} className="size-3.5" />
                      <span>{item.platform}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.timestamp}</span>
                  </div>
                  {item.title && <p className="font-semibold text-foreground line-clamp-1">{item.title}</p>}
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">{item.caption}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border text-[11px]">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${item.title ? item.title + "\n\n" : ""}${item.caption}\n\n${item.hashtags}`, item.id)}
                      className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Copy className="size-3" />
                      <span>{copiedKey === item.id ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedSnippet(item.id)}
                      className="text-muted-foreground hover:text-red-600 p-1 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
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
        {/* Left Column: Studio Controls */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="rounded-xl border border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prompt &amp; Settings
              </CardTitle>
              <CardDescription className="text-xs text-foreground font-medium pt-0.5">
                Attach media or give context for the AI engine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <label
                htmlFor="studio-file-upload"
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center cursor-pointer transition-colors",
                  previewUrl ? "border-indigo-600/60 bg-indigo-50/20 dark:bg-indigo-950/20" : "border-border hover:bg-muted/40"
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
                      <video src={previewUrl} controls playsInline aria-label="Video preview" className="max-h-40 w-full rounded-md object-contain" />
                    ) : (
                      <img src={previewUrl} alt="Studio Preview" className="max-h-40 w-full rounded-md object-contain" />
                    )}
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium block">
                      Replace Asset
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-3">
                    <Upload className="mx-auto size-5 text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">Attach Photo or Video</p>
                    <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP, MP4</p>
                  </div>
                )}
              </label>

              <div className="space-y-1.5">
                <label htmlFor="caption-context" className="text-xs font-medium text-foreground">
                  Context / Topic Prompt
                </label>
                <Textarea
                  id="caption-context"
                  placeholder="E.g., Announcing our new pricing tiers and scheduling capabilities..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={3}
                  className="text-xs rounded-lg resize-none leading-relaxed border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                    className="w-full rounded-lg border border-input bg-background p-1.5 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Tanglish">Tanglish</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as SupportedTone)}
                    className="w-full rounded-lg border border-input bg-background p-1.5 text-xs text-foreground focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Viral-style">Viral</option>
                    <option value="Creative">Creative</option>
                    <option value="Educational">Educational</option>
                    <option value="Promotional">Promotional</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
                className="w-full gap-1.5 text-xs h-9 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Sparkles className={cn("size-3.5", isGenerating && "animate-spin")} />
                <span>{isGenerating ? "Generating..." : "Generate Captions"}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Visual Analysis Metadata Card */}
          {analysisResult && (
            <Card className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Eye className="size-3.5 text-muted-foreground" />
                <h3 className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Visual Analysis Insights
                </h3>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground font-medium text-[11px]">Summary:</span>
                  <p className="text-foreground mt-0.5 leading-relaxed">{analysisResult.summary}</p>
                </div>
                {analysisResult.extracted_text && (
                  <div>
                    <span className="text-muted-foreground font-medium text-[11px]">OCR Text:</span>
                    <p className="text-foreground font-mono bg-muted/40 p-2 rounded-md mt-0.5 text-[10px] border border-border">
                      {analysisResult.extracted_text}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground font-medium text-[11px]">Detected Topics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(analysisResult.topics || []).map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] rounded-md border-border">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Platform Output Studio */}
        <div className="space-y-4 lg:col-span-8">
          <Card className="rounded-xl border border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Generated Content
                  </CardTitle>
                  <CardDescription className="text-xs text-foreground font-medium pt-0.5">
                    Platform-tailored copy, hooks, and hashtags.
                  </CardDescription>
                </div>

                {analysisResult && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating}
                    className="h-8 text-xs gap-1.5 rounded-lg border-border"
                  >
                    <RefreshCw className={cn("size-3", isGenerating && "animate-spin")} />
                    <span>Regenerate</span>
                  </Button>
                )}
              </div>

              {/* Platform Output Tab Buttons */}
              <div className="flex items-center gap-1 pt-3 overflow-x-auto custom-scrollbar">
                {(["instagram", "facebook", "linkedin", "youtube"] as SocialPlatform[]).map((p) => {
                  const isActive = activePlatformTab === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePlatformTab(p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors shrink-0",
                        isActive
                          ? "bg-indigo-600 text-white font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <PlatformIcon platform={p} className="size-3.5" />
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
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Suggested Title
                          </label>
                          <div className="p-2.5 rounded-lg border border-border bg-background font-medium text-xs text-foreground flex items-center justify-between">
                            <span>{variant.title}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(variant.title || "", "title")}
                              className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                              title="Copy title"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Caption display */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Caption Body
                          </label>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {variant.caption.length} characters
                          </span>
                        </div>
                        <div className="p-3.5 rounded-lg border border-border bg-background text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                          {variant.caption}
                        </div>
                      </div>

                      {/* Hashtags display */}
                      {variant.hashtags && variant.hashtags.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Hashtags ({variant.hashtags.length})
                          </label>
                          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-border bg-background">
                            {variant.hashtags.map((h, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md"
                              >
                                {h.startsWith("#") ? h : `#${h}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Call to action & rationale */}
                      {variant.rationale && (
                        <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground space-y-1">
                          <span className="font-medium text-foreground text-[11px]">Context &amp; Angle:</span>
                          <p className="leading-relaxed">{variant.rationale}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(fullCopy, "full")}
                            className="text-xs h-8 gap-1.5 rounded-lg border-border"
                          >
                            <Copy className="size-3.5" />
                            <span>{copiedKey === "full" ? "Copied" : "Copy Post"}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveToHistory(activePlatformTab, variant.caption, variant.hashtags || [], variant.title)}
                            className="text-xs h-8 gap-1.5 rounded-lg border-border"
                          >
                            <Bookmark className="size-3.5 text-muted-foreground" />
                            <span>Save</span>
                          </Button>
                        </div>

                        <Link href="/dashboard/create-post">
                          <Button size="sm" className="text-xs h-8 gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                            <span>Use in Composer</span>
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-16 text-center space-y-2.5">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Sparkles className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">Ready to generate</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Click &ldquo;Generate Captions&rdquo; or pick a quick prompt to create copy for all channels.
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
