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

const EDITORIAL_PRESETS = [
  { label: "Enterprise AI Architecture", icon: Cpu, prompt: "Autonomous Multi-Platform Social Media Automation Architecture and System Launch", tone: "Professional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Product Milestone Release", icon: Layers, prompt: "Major Product Milestone Release and Next-Gen Engineering Platform Overview", tone: "Promotional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Distribution Efficiency", icon: SlidersHorizontal, prompt: "Eliminating Multi-Channel Content Distribution Bottlenecks via Automated Orchestration", tone: "Creative" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Engineering Demonstration", icon: Terminal, prompt: "Final Year Computer Science Major Project Demonstration: SocialFlow AI", tone: "Professional" as SupportedTone, lang: "English" as SupportedLanguage },
  { label: "Bilingual Tanglish Overview", icon: Globe, prompt: "Multi-platform content distribution-la irukkura manual work-ah simplify panna oru comprehensive system", tone: "Friendly" as SupportedTone, lang: "Tanglish" as SupportedLanguage },
];

export default function AICaptionStudioPage() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [userPrompt, setUserPrompt] = React.useState("");
  const [language, setLanguage] = React.useState<SupportedLanguage>("English");
  const [tone, setTone] = React.useState<SupportedTone>("Professional");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<GeminiAnalysisResult | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isGenerating) return;
    setAnalysisResult(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSelectPreset = (preset: typeof EDITORIAL_PRESETS[0]) => {
    setUserPrompt(preset.prompt);
    setTone(preset.tone);
    if (preset.lang) {
      setLanguage(preset.lang);
    }
    toast.info(`Selected preset: ${preset.label}`);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const notice = toast.loading("Generating captions and titles");

    try {
      const media = selectedFile ? await prepareMediaPreview(selectedFile) : {};

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt,
          language,
          tone,
          ...media,
          alternatives: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");

      setAnalysisResult(json.data);
      const provider = json.source === "Gemini" || json.source === "OpenAI" ? json.source : "AI";
      toast.success("Captions and titles generated with " + provider, { id: notice });
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
    toast.success("Content copied to clipboard.");
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest uppercase text-indigo-400 font-semibold">
              Editorial Studio
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[11px] font-mono text-muted-foreground">Google Stitch Design System</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            AI Caption Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multimodal visual understanding, OCR text extraction, and platform-tailored editorial copy.
          </p>
        </div>

        <Link href="/dashboard/create-post">
          <Button variant="stitch" size="sm" className="gap-2 text-xs">
            <Send className="h-3.5 w-3.5" />
            <span>Open Campaign Builder</span>
          </Button>
        </Link>
      </div>

      <TrendResearch />
      {/* Editorial Presets */}
      <Card className="border-border/80 bg-card p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-accent/30 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-slate-600 hover:bg-accent/60 transition-colors"
                >
                  <Icon className="h-3 w-3 text-primary" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (4 cols): Studio Controls */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="border-border/80">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Input & Parameters
              </CardTitle>
              <CardDescription className="text-xs text-foreground font-medium pt-1">
                Upload asset for visual OCR analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <label
                htmlFor="studio-file-upload"
                className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center cursor-pointer transition-colors ${
                  previewUrl ? "border-primary/60 bg-primary/5" : "border-border hover:bg-accent/30"
                }`}
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
                      <video src={previewUrl} controls playsInline aria-label="Video preview" className="max-h-44 w-full rounded-lg object-contain" />
                    ) : (
                      <img src={previewUrl} alt="Studio Preview" className="max-h-44 w-full rounded-lg object-contain" />
                    )}
                    <span className="text-[11px] text-primary hover:underline block font-mono">Replace Asset</span>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">Attach visual media</p>
                    <p className="text-[10px] text-muted-foreground font-mono">PNG, JPEG, WEBP</p>
                  </div>
                )}
              </label>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Topic or Objective:</label>
                <Textarea
                  placeholder="Enter context, project release, feature highlights..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={3}
                  className="text-xs font-sans leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Language:</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                    className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Creative">Creative</option>
                    <option value="Educational">Educational</option>
                    <option value="Minimal">Minimal</option>
                    <option value="Promotional">Promotional</option>
                  </select>
                </div>
              </div>

              <Button
                variant="stitch"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full gap-2 text-xs"
              >
                <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? "Generating…" : "Generate captions and titles"}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Visual Analysis Metadata Card */}
          {analysisResult && (
            <Card className="border-border/80 animate-in fade-in duration-200">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  Visual analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Visual Summary:</span>
                  <p className="text-foreground mt-0.5 leading-relaxed">{analysisResult.summary}</p>
                </div>
                {analysisResult.extracted_text && (
                  <div>
                    <span className="text-muted-foreground font-semibold">OCR Extracted Text:</span>
                    <p className="text-foreground font-mono bg-accent/40 p-2 rounded mt-0.5 text-[11px] border border-border/60">
                      {analysisResult.extracted_text}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground font-semibold">Identified Elements:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysisResult.detected_objects.map((obj, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-mono">
                        {obj}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (8 cols): Generated Platform Cards Grid */}
        <div className="space-y-4 lg:col-span-8">
          {!analysisResult ? (
            <Card className="border-border/80 bg-card/60 flex flex-col items-center justify-center p-12 text-center min-h-[420px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-primary mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Studio Ready for Ingestion</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Select an editorial preset or upload visual media on the left, then click Generate to produce clean platform copy.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
              {/* LinkedIn Card */}
              <Card className="border-border/80 flex flex-col justify-between">
                <CardHeader className="pb-2 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform="linkedin" className="h-4 w-4" />
                      <span className="font-mono text-xs font-semibold uppercase text-sky-400">LinkedIn Output</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysisResult.platforms.linkedin.caption, "linkedin")}
                      className="h-7 px-2 text-xs"
                    >
                      {copiedKey === "linkedin" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 space-y-2">
                  <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans">
                    {analysisResult.platforms.linkedin.caption}
                  </p>
                    {analysisResult.platforms.linkedin.alternatives?.map((caption, index) => (
                      <details key={caption} className="rounded border p-2 text-xs">
                        <summary className="cursor-pointer">Caption option {index + 2}</summary>
                        <p className="whitespace-pre-wrap py-2">{caption}</p>
                        <Button size="sm" variant="outline" onClick={() => setAnalysisResult((current) => current && current.platforms.linkedin ? ({
                          ...current, platforms: { ...current.platforms, linkedin: {
                            ...current.platforms.linkedin, caption,
                            alternatives: current.platforms.linkedin.alternatives?.map((value) => value === caption ? current.platforms.linkedin.caption : value),
                          } },
                        }) : current)}>Use caption</Button>
                      </details>
                    ))}
                    <p className="text-xs text-muted-foreground">{analysisResult.platforms.linkedin.rationale}</p>
                  <div className="pt-2 flex flex-wrap gap-1">
                    {analysisResult.platforms.linkedin.hashtags.map((h, i) => (
                      <span key={i} className="text-[10px] text-primary font-mono">{h}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Instagram Card */}
              <Card className="border-border/80 flex flex-col justify-between">
                <CardHeader className="pb-2 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform="instagram" className="h-4 w-4" />
                      <span className="font-mono text-xs font-semibold uppercase text-pink-400">Instagram Output</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysisResult.platforms.instagram.caption, "instagram")}
                      className="h-7 px-2 text-xs"
                    >
                      {copiedKey === "instagram" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 space-y-2">
                  <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans">
                    {analysisResult.platforms.instagram.caption}
                  </p>
                    {analysisResult.platforms.instagram.alternatives?.map((caption, index) => (
                      <details key={caption} className="rounded border p-2 text-xs">
                        <summary className="cursor-pointer">Caption option {index + 2}</summary>
                        <p className="whitespace-pre-wrap py-2">{caption}</p>
                        <Button size="sm" variant="outline" onClick={() => setAnalysisResult((current) => current && current.platforms.instagram ? ({
                          ...current, platforms: { ...current.platforms, instagram: {
                            ...current.platforms.instagram, caption,
                            alternatives: current.platforms.instagram.alternatives?.map((value) => value === caption ? current.platforms.instagram.caption : value),
                          } },
                        }) : current)}>Use caption</Button>
                      </details>
                    ))}
                    <p className="text-xs text-muted-foreground">{analysisResult.platforms.instagram.rationale}</p>
                  <div className="pt-2 flex flex-wrap gap-1">
                    {analysisResult.platforms.instagram.hashtags.map((h, i) => (
                      <span key={i} className="text-[10px] text-pink-400 font-mono">{h}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Facebook Card */}
              <Card className="border-border/80 flex flex-col justify-between">
                <CardHeader className="pb-2 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform="facebook" className="h-4 w-4" />
                      <span className="font-mono text-xs font-semibold uppercase text-blue-400">Facebook Output</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysisResult.platforms.facebook.caption, "facebook")}
                      className="h-7 px-2 text-xs"
                    >
                      {copiedKey === "facebook" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 space-y-2">
                  <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans">
                    {analysisResult.platforms.facebook.caption}
                  </p>
                    {analysisResult.platforms.facebook.alternatives?.map((caption, index) => (
                      <details key={caption} className="rounded border p-2 text-xs">
                        <summary className="cursor-pointer">Caption option {index + 2}</summary>
                        <p className="whitespace-pre-wrap py-2">{caption}</p>
                        <Button size="sm" variant="outline" onClick={() => setAnalysisResult((current) => current && current.platforms.facebook ? ({
                          ...current, platforms: { ...current.platforms, facebook: {
                            ...current.platforms.facebook, caption,
                            alternatives: current.platforms.facebook.alternatives?.map((value) => value === caption ? current.platforms.facebook.caption : value),
                          } },
                        }) : current)}>Use caption</Button>
                      </details>
                    ))}
                    <p className="text-xs text-muted-foreground">{analysisResult.platforms.facebook.rationale}</p>
                  <div className="pt-2 flex flex-wrap gap-1">
                    {analysisResult.platforms.facebook.hashtags.map((h, i) => (
                      <span key={i} className="text-[10px] text-blue-400 font-mono">{h}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* YouTube Card */}
              {analysisResult.platforms.youtube && (
                <Card className="border-border/80 flex flex-col justify-between">
                  <CardHeader className="pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform="youtube" className="h-4 w-4" />
                        <span className="font-mono text-xs font-semibold uppercase text-red-400">YouTube Output</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(analysisResult.platforms.youtube!.caption, "youtube")}
                        className="h-7 px-2 text-xs"
                      >
                        {copiedKey === "youtube" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 space-y-2">
                    <p className="text-xs font-semibold text-foreground">
                      Title: {analysisResult.platforms.youtube.title}
                    </p>
                    <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans">
                      {analysisResult.platforms.youtube.caption}
                    </p>
                    {analysisResult.platforms.youtube.alternatives?.map((caption, index) => (
                      <details key={caption} className="rounded border p-2 text-xs">
                        <summary className="cursor-pointer">Caption option {index + 2}</summary>
                        <p className="whitespace-pre-wrap py-2">{caption}</p>
                        <Button size="sm" variant="outline" onClick={() => setAnalysisResult((current) => current && current.platforms.youtube ? ({
                          ...current, platforms: { ...current.platforms, youtube: {
                            ...current.platforms.youtube, caption,
                            alternatives: current.platforms.youtube.alternatives?.map((value) => value === caption ? current.platforms.youtube!.caption : value),
                          } },
                        }) : current)}>Use caption</Button>
                      </details>
                    ))}
                    <p className="text-xs text-muted-foreground">{analysisResult.platforms.youtube.rationale}</p>
                    <div className="pt-2 flex flex-wrap gap-1">
                      {analysisResult.platforms.youtube.keywords?.length ? <p className="text-xs">Keywords · {analysisResult.platforms.youtube.keywords.join(", ")}</p> : null}
                    {analysisResult.platforms.youtube.suggested_category && <p className="text-xs">Category · {analysisResult.platforms.youtube.suggested_category}</p>}
                    {analysisResult.platforms.youtube.thumbnail_recommendation && <p className="text-xs">Thumbnail · {analysisResult.platforms.youtube.thumbnail_recommendation}</p>}
                    {analysisResult.platforms.youtube.hashtags.map((h, i) => (
                        <span key={i} className="text-[10px] text-red-400 font-mono">{h}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
