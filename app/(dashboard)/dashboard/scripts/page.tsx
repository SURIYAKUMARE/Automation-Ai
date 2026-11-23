"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  Flame,
  Sparkles,
  Copy,
  Check,
  Send,
  RefreshCw,
  Film,
  Layers,
  ArrowRight,
  Clock,
  Search,
  CheckCircle2,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";

interface TrendingTopic {
  category: string;
  title: string;
  searchVolume: string;
  hookIdea: string;
}

interface ScriptBeat {
  timecode: string;
  visual: string;
  spoken: string;
}

interface ScriptOutput {
  title: string;
  platform: SocialPlatform;
  hooks: { text: string; formula: string; score: number }[];
  script_beats: ScriptBeat[];
  caption: string;
  hashtags: string[];
  estimated_runtime: string;
}

export default function ScriptStudioPage() {
  const router = useRouter();
  const [topic, setTopic] = React.useState("Autonomous Multi-Platform Distribution in 2026");
  const [platform, setPlatform] = React.useState<"youtube" | "instagram">("youtube");
  const [tone, setTone] = React.useState("Professional");
  const [language, setLanguage] = React.useState("English");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [trendingTopics, setTrendingTopics] = React.useState<TrendingTopic[]>([]);
  const [script, setScript] = React.useState<ScriptOutput | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/ai/scripts")
      .then((res) => res.json())
      .then((data) => {
        if (data.topics) setTrendingTopics(data.topics);
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async (selectedTopic?: string, selectedPlatform?: "youtube" | "instagram") => {
    const activeTopic = selectedTopic ?? topic;
    const activePlatform = selectedPlatform ?? platform;
    if (!activeTopic.trim()) {
      toast.error("Please enter a topic or select a trending idea.");
      return;
    }

    setIsGenerating(true);
    const notice = toast.loading(`Generating retention-scored ${activePlatform === "youtube" ? "YouTube" : "Instagram"} script...`);
    try {
      const res = await fetch("/api/ai/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: activeTopic,
          platform: activePlatform,
          tone,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Script generation failed");
      setScript(data.script);
      toast.success("Script generated with 21 hook formulas and retention beats!", { id: notice });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate script", { id: notice });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyScript = () => {
    if (!script) return;
    const lines = [
      `TITLE: ${script.title}`,
      `PLATFORM: ${script.platform.toUpperCase()}`,
      `RUNTIME: ${script.estimated_runtime}`,
      "\n--- HOOK OPTIONS ---",
      ...script.hooks.map((h, i) => `Hook ${i + 1} (${h.formula} - Score ${h.score}/100):\n"${h.text}"`),
      "\n--- BEAT-BY-BEAT RETENTION SCRIPT ---",
      ...script.script_beats.map((b) => `[${b.timecode}]\n[ON SCREEN: ${b.visual}]\nSpoken: "${b.spoken}"\n`),
      "--- CAPTION & HASHTAGS ---",
      script.caption,
      script.hashtags.join(" "),
    ].join("\n");

    navigator.clipboard.writeText(lines);
    setCopied(true);
    toast.success("Full script & visual beats copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToCreatePost = () => {
    if (!script) return;
    const query = new URLSearchParams({
      platform: script.platform,
      prompt: script.title,
    });
    router.push(`/dashboard/create-post?${query.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Film className="h-6 w-6 text-primary" />
              Script Studio &amp; Viral Trends
            </h1>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
              YouTube &amp; Instagram Agent Skills
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn trending topics into high-retention video scripts scored against 21 proven hook formulas.
          </p>
        </div>
        {script && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyScript}
              className="text-xs h-9 gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Script"}
            </Button>
            <Button
              size="sm"
              onClick={handleSendToCreatePost}
              className="text-xs h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Send to Create Post
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Trending Topics Radar */}
      <Card className="border-border bg-gradient-to-r from-blue-950/20 via-background to-sky-950/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              Today&apos;s Google &amp; YouTube Trending Topics
            </CardTitle>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              Live Radar
            </span>
          </div>
          <CardDescription className="text-xs">
            Click any trending topic to instantly load it into the script generator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {trendingTopics.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTopic(item.title);
                  void handleGenerate(item.title);
                }}
                className="p-3 text-left rounded-lg border border-border bg-card/60 hover:bg-accent/40 hover:border-foreground/30 transition-all text-xs space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] font-normal py-0">
                    {item.category}
                  </Badge>
                  <span className="text-[10px] text-emerald-500 font-mono font-medium">
                    {item.searchVolume}
                  </span>
                </div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {item.title}
                </p>
                <p className="text-muted-foreground text-[11px] line-clamp-1 italic">
                  Hook: &ldquo;{item.hookIdea}&rdquo;
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Studio Generator Form */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Script Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Select your platform format, target tone, and customize your topic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Video Topic or Raw Idea</label>
              <div className="relative">
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Why 90% of creators fail with retention"
                  className="pr-10 text-xs"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Platform</label>
              <div className="flex rounded-lg border border-border p-1 bg-muted/20 gap-1">
                <button
                  type="button"
                  onClick={() => setPlatform("youtube")}
                  className={`flex-1 py-1.5 px-2 text-xs rounded font-medium flex items-center justify-center gap-1.5 transition-all ${
                    platform === "youtube"
                      ? "bg-background text-foreground shadow-sm font-semibold border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PlatformIcon platform="youtube" className="size-3.5" />
                  YouTube
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("instagram")}
                  className={`flex-1 py-1.5 px-2 text-xs rounded font-medium flex items-center justify-center gap-1.5 transition-all ${
                    platform === "instagram"
                      ? "bg-background text-foreground shadow-sm font-semibold border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PlatformIcon platform="instagram" className="size-3.5" />
                  Instagram Reel
                </button>
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
              >
                <option value="Professional">Professional &amp; Authoritative</option>
                <option value="Urgent">Urgent &amp; High Stakes</option>
                <option value="Educational">Educational &amp; Step-by-Step</option>
                <option value="Creative">Creative &amp; Storytelling</option>
                <option value="Casual">Casual &amp; Conversational</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleGenerate()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 gap-2 px-5"
            >
              {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? "Writing Script..." : "Generate Viral Script"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Script Display */}
      {script && (
        <div className="space-y-6">
          {/* Hook Options */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Hook Options (Scored with yt-script / ig-reel Formulas)
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Runtime: {script.estimated_runtime}
                </span>
              </div>
              <CardDescription className="text-xs">
                The first 15 seconds decide 80% of retention. Never shoot with a generic intro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {script.hooks.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                        Formula: {h.formula}
                      </Badge>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        Score: {h.score}/100 STRONG
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground italic">
                      &ldquo;{h.text}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Beat Sheet */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Tv className="h-4 w-4 text-blue-500" />
                Timed Beat Sheet &amp; Visual Directions
              </CardTitle>
              <CardDescription className="text-xs">
                Every beat pairs what is shown on screen with what is spoken out loud.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {script.script_beats.map((beat, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg border border-border bg-muted/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono font-semibold text-primary text-[11px]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{beat.timecode}</span>
                    </div>
                    <div className="rounded bg-background p-2.5 border border-border/80 font-mono text-[11px] text-amber-500/90 dark:text-amber-400">
                      <strong>[ON SCREEN]:</strong> {beat.visual}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed pl-1">
                      <strong className="text-xs font-semibold text-muted-foreground block mb-0.5">Spoken Voiceover:</strong>
                      {beat.spoken}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Caption & Hashtags */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Caption &amp; Viral Hashtags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-foreground whitespace-pre-wrap leading-relaxed">
                {script.caption}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {script.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
