"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Share2,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Layers,
  Copy,
  Check,
  Globe2,
  ChevronRight,
  Sun,
  Moon,
  Video,
  Eye,
  Sliders,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState<"instagram" | "linkedin" | "youtube" | "facebook">("instagram");
  const [copied, setCopied] = React.useState(false);

  const platforms = [
    { id: "instagram", name: "Instagram", type: "Reels & Carousel", api: "Meta Graph API v21.0" },
    { id: "linkedin", name: "LinkedIn", type: "Posts & Native Video", api: "LinkedIn REST API" },
    { id: "youtube", name: "YouTube", type: "1080p Video & Shorts", api: "Google YouTube Data v3" },
    { id: "facebook", name: "Facebook", type: "Pages & Reels", api: "Meta Graph API v21.0" },
  ] as const;

  const features = [
    {
      icon: Sparkles,
      title: "Context-Aware Gemini Engine",
      desc: "Fast multimodal analysis for images and video frames. Extracts legible OCR text and writes tailored hooks, bodies, and hashtags for each platform.",
    },
    {
      icon: Share2,
      title: "Direct Official OAuth Adapters",
      desc: "Built on official Meta, LinkedIn, and YouTube APIs with token refresh and error recovery. No fragile web scraping or emulators.",
    },
    {
      icon: Video,
      title: "Built-In FFmpeg & Auto-Sizing",
      desc: "Automatically formats photos to standard 1080p Instagram ratios and encodes single images into 30-second 1080p MP4 videos for YouTube.",
    },
    {
      icon: Clock,
      title: "Precision Content Calendar",
      desc: "Plan weeks ahead with Month, Week, and Day views. Reschedule posts with drag-and-drop or batch release across multiple timezones.",
    },
    {
      icon: ShieldCheck,
      title: "Dual Publishing Workflows",
      desc: "Choose Mode A for automatic background broadcasting upon file upload, or Mode B for multi-tier staging, review, and team approval.",
    },
    {
      icon: TrendingUp,
      title: "Verified Telemetry & History",
      desc: "Live external permalinks to published posts, real API delivery receipts, and genuine engagement metrics without simulated numbers.",
    },
  ];

  const previewContent = {
    instagram: {
      account: "SocialSync Creator",
      handle: "@socialsync_ai",
      title: "Instagram Reel",
      caption: "Stop spending 3 hours adapting content for 4 different platforms.\n\nSocialSync analyzes your visual asset, drafts platform-native copy, and syndicates everywhere in seconds.\n\n#buildinpublic #automation #socialmedia #creators",
      engagement: "1,420 likes • 84 comments",
    },
    linkedin: {
      account: "SocialSync",
      handle: "socialsync.ai • 14,200 followers",
      title: "LinkedIn Thought Leadership",
      caption: "Growth teams lose over 15 hours every week manually copy-pasting the same assets across isolated dashboard silos.\n\nWith autonomous multi-platform orchestration and direct OAuth adapters, cross-posting is now instantaneous and error-free.\n\nHow is your team streamlining distribution this quarter?",
      engagement: "389 reactions • 42 comments",
    },
    youtube: {
      account: "SocialSync AI",
      handle: "@socialsync_ai • 28K subscribers",
      title: "How to Automate Cross-Platform Publishing in 2026",
      caption: "A comprehensive walkthrough of automating multi-channel publishing with Gemini AI and official OAuth integrations. Make sure to subscribe for weekly workflow tutorials!",
      engagement: "1.2K likes • 14.2K views",
    },
    facebook: {
      account: "SocialSync Community",
      handle: "Software & Technology Page",
      title: "Facebook Page Update",
      caption: "How much time does your team spend managing social publishing every week?\n\nHere is how SocialSync publishes to Instagram Reels, LinkedIn, YouTube, and Facebook simultaneously without duplicate work.",
      engagement: "512 shares • 98 comments",
    },
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(previewContent[activeTab].caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-indigo-500/20">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md px-4 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Layers size={15} />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            SocialSync <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">AI</span>
          </span>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#preview" className="hover:text-foreground transition-colors">Product Preview</a>
          <a href="#channels" className="hover:text-foreground transition-colors">Integrations</a>
          <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Toggle appearance"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <span>Dashboard</span>
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 pt-16 pb-16 sm:pt-24 sm:pb-24 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>Official Meta, LinkedIn &amp; YouTube APIs</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.1] max-w-3xl mx-auto">
          Create Once.{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            Publish Everywhere.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
          The unified publishing engine for modern creators and teams. Upload your photos or videos, let AI tailor native captions and titles, and publish simultaneously to Instagram, Facebook, LinkedIn, and YouTube.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/dashboard/create-post">
            <Button size="lg" className="h-10 px-5 text-xs font-semibold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <span>Compose a Post</span>
              <ArrowRight size={14} />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="h-10 px-5 text-xs font-medium border-border">
              <span>Open Workspace</span>
            </Button>
          </Link>
        </div>

        {/* Channel Badges */}
        <div id="channels" className="pt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-muted-foreground">
          <span className="text-[11px] font-medium mr-2">Supported Channels:</span>
          {platforms.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-foreground text-xs shadow-2xs"
            >
              <PlatformIcon platform={p.id} className="size-4" />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Product Preview Showcase */}
      <section id="preview" className="px-4 pb-20 max-w-5xl mx-auto w-full">
        <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Mock Window Title Bar */}
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-muted-foreground font-mono ml-2">socialsync-composer</span>
            </div>

            {/* Platform View Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-background border border-border p-0.5">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTab(p.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium capitalize flex items-center gap-1.5 transition-colors",
                    activeTab === p.id
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <PlatformIcon platform={p.id} className="size-3" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Preview Body */}
          <div className="p-6 grid gap-6 md:grid-cols-12 items-start">
            {/* Left simulated editor */}
            <div className="md:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Generated Caption</span>
                <span className="font-mono text-[11px]">{previewContent[activeTab].caption.length} characters</span>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-background text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground min-h-[160px]">
                {previewContent[activeTab].caption}
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyCaption}
                  className="h-8 text-xs gap-1.5 rounded-lg border-border"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy Caption"}</span>
                </Button>
                <Link href="/dashboard/create-post">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1">
                    Try in Composer <ArrowRight size={12} />
                  </span>
                </Link>
              </div>
            </div>

            {/* Right simulated feed post */}
            <div className="md:col-span-6 p-4 rounded-xl border border-border bg-background space-y-3 text-xs shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
                    S
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-xs leading-none">
                      {previewContent[activeTab].account}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                      {previewContent[activeTab].handle}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {activeTab} Feed
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                <p className="line-clamp-4">{previewContent[activeTab].caption}</p>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>{previewContent[activeTab].engagement}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Synced via API</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="px-4 py-16 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="space-y-1 text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Engineered for Speed and Reliability
            </h2>
            <p className="text-xs text-muted-foreground">
              No bloated fluff. Every tool is built directly to save time and publish error-free.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-5 rounded-xl border border-border bg-card space-y-2.5 transition-colors hover:border-muted-foreground/40"
                >
                  <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Icon size={17} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="workflow" className="px-4 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Three-Step Workflow
            </h2>
            <p className="text-xs text-muted-foreground">
              From raw photo or video to synchronized multi-network release.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-5 rounded-xl border border-border bg-card space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">01</span>
              <h3 className="text-sm font-semibold text-foreground">Attach Media</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload image carousels or HD MP4 video. Our direct storage pipeline handles up to 100MB seamlessly.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">02</span>
              <h3 className="text-sm font-semibold text-foreground">AI Adapts Channels</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gemini identifies visual subjects and drafts tailored titles, hooks, and hashtags for Instagram, LinkedIn, and YouTube.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">03</span>
              <h3 className="text-sm font-semibold text-foreground">Publish or Schedule</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Release instantly across all networks or queue into the content calendar for automatic background dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-8 mt-auto text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">SocialSync AI</span>
            <span>•</span>
            <span>Omnichannel Publishing Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
