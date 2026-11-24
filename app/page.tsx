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
  Play,
  Layers,
  Sliders,
  Copy,
  Check,
  Laptop,
  Smartphone,
  Globe2,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "@/components/platform-icon";
import { useTheme } from "@/components/theme-provider";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [activePreviewTab, setActivePreviewTab] = React.useState<"instagram" | "linkedin" | "youtube" | "facebook">("instagram");
  const [demoPrompt, setDemoPrompt] = React.useState("Launching our next-generation AI workflow for cross-platform automation");
  const [demoTone, setDemoTone] = React.useState("Professional");
  const [isCopied, setIsCopied] = React.useState(false);

  const platforms = [
    { id: "instagram", name: "Instagram", type: "Reels & Feed", badge: "Official Meta API" },
    { id: "linkedin", name: "LinkedIn", type: "Articles & Video", badge: "Official v2 REST" },
    { id: "youtube", name: "YouTube", type: "Shorts & Videos", badge: "Data API v3" },
    { id: "facebook", name: "Facebook", type: "Pages & Reels", badge: "Graph API v23.0" },
  ] as const;

  const features = [
    {
      icon: Sparkles,
      title: "Multimodal Gemini AI Engine",
      desc: "Instant image & video frame analysis with OCR text extraction. Synthesizes tailored hooks, body copy, and relevant hashtags for each platform.",
      tag: "AI Intelligence",
    },
    {
      icon: Share2,
      title: "4 Official OAuth Direct Adapters",
      desc: "Built directly upon official Meta Graph, LinkedIn REST, and YouTube Data APIs. No fragile web scraping or unofficial mobile emulators.",
      tag: "Official APIs",
    },
    {
      icon: Zap,
      title: "Autonomous & Human-in-the-Loop",
      desc: "Choose Mode A for hands-free instant parallel broadcasting, or Mode B for multi-tier editorial review, staging, and approval.",
      tag: "Dual Workflows",
    },
    {
      icon: ShieldCheck,
      title: "Hardware-Grade Security",
      desc: "AES-256-GCM token encryption at rest with strict Supabase Row Level Security (RLS) ensuring 100% tenant data isolation.",
      tag: "Enterprise Trust",
    },
    {
      icon: Clock,
      title: "Resilient Scheduling Engine",
      desc: "Precision scheduling with time-zone normalization, idempotency keys, background execution, and automated exponential retries.",
      tag: "Zero Downtime",
    },
    {
      icon: TrendingUp,
      title: "Authentic Telemetry & Permalinks",
      desc: "Live external permalinks, real API delivery receipts, and genuine engagement metrics without fabricated or simulated data.",
      tag: "Live Analytics",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Attach Your Media",
      desc: "Upload photos, graphic carousels, or high-definition MP4/MOV videos. Our direct storage pipeline handles up to 100 MB seamlessly.",
    },
    {
      num: "02",
      title: "AI Adapts Every Channel",
      desc: "Gemini analyzes visual keyframes, extracts readable text, and tailors unique captions, hashtags, and titles for each network.",
    },
    {
      num: "03",
      title: "Broadcast Everywhere",
      desc: "Publish instantly in parallel across Instagram, LinkedIn, YouTube, and Facebook, or schedule for peak engagement windows.",
    },
  ];

  const previewContent = {
    instagram: {
      account: "SocialSync Creator",
      handle: "@socialsync.ai",
      mediaType: "reel",
      caption: "Stop spending 3 hours adapting content for 4 different apps. 🚀\n\nSocialSync AI analyzes your video, writes native hooks for each channel, and broadcasts simultaneously.\n\n#socialmedia #automation #growthhacks #creatorlife #reels",
      cta: "Try it free at socialsync.ai",
      likes: "1,420 likes",
    },
    linkedin: {
      account: "SocialSync Enterprise",
      handle: "socialsync.ai • 12,400 followers",
      mediaType: "video",
      caption: "Excited to share our latest milestone in multi-platform content distribution.\n\nModern growth teams shouldn't lose hours copy-pasting assets across isolated dashboards. With autonomous orchestration and hardware-grade security, enterprise distribution is now instantaneous.\n\nWhat are your thoughts on AI-assisted publishing?",
      cta: "Learn more: https://socialsync.ai",
      likes: "389 reactions • 42 comments",
    },
    youtube: {
      account: "SocialSync AI Official",
      handle: "@socialsync_ai • 28K subscribers",
      mediaType: "video",
      title: "Create Once. Publish Everywhere: Full Platform Walkthrough",
      caption: "Full breakdown of autonomous social publishing with Google Gemini 2.5 and official OAuth APIs. Don't forget to subscribe for weekly workflow tutorials!",
      cta: "Subscribe for more workflows",
      likes: "1.2K likes",
    },
    facebook: {
      account: "SocialSync Community",
      handle: "Productivity & AI Tools Page",
      mediaType: "video",
      caption: "How much time do you spend managing your social channels every week? Drop a comment below!\n\nHere's how SocialSync AI publishes to Instagram Reels, LinkedIn, YouTube, and Facebook simultaneously. ⚡",
      cta: "Send Message",
      likes: "512 shares • 98 comments",
    },
  };

  const copyDemoCaption = () => {
    navigator.clipboard.writeText(previewContent[activePreviewTab].caption);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Floating Glass Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
            <Sparkles size={18} className="transition-transform group-hover:scale-110" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight leading-tight flex items-center gap-1">
              SocialSync
              <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                AI
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
              Commercial Publishing Suite
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#preview" className="hover:text-foreground transition-colors">
            Product Preview
          </a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#platforms" className="hover:text-foreground transition-colors">
            Platforms
          </a>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-medium">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="stitch" size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
              <span>Open Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:pt-28 sm:pb-32 text-center max-w-5xl mx-auto overflow-hidden">
        {/* Subtle Ambient Radial Glows */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl -z-10" />
        <div className="pointer-events-none absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-violet-500/10 rounded-full blur-3xl -z-10" />

        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-6 backdrop-blur-xs">
          <span className="flex size-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Next-Generation Social Media Orchestration</span>
          <ChevronRight size={13} className="text-indigo-400" />
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08] max-w-4xl mx-auto">
          Create Once.{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
            Publish Everywhere.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
          The unified distribution engine for modern creators and growth teams. Auto-adapt, schedule, and broadcast content natively across Instagram, LinkedIn, YouTube, and Facebook.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard/create-post">
            <Button variant="stitch" size="lg" className="gap-2 shadow-lg shadow-indigo-500/25">
              <span>Start Publishing Free</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#preview">
            <Button variant="outline" size="lg" className="gap-2 bg-card/60 backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Watch Live Demo</span>
            </Button>
          </a>
        </div>

        {/* Supported Platforms Strip */}
        <div id="platforms" className="mt-14 pt-8 border-t border-border/60 flex flex-col items-center gap-4">
          <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground/80">
            Certified Direct Official Integrations
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            {platforms.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3.5 py-2 text-xs font-medium text-foreground shadow-xs hover:border-indigo-500/40 transition-colors"
              >
                <PlatformIcon platform={p.id} className="size-5 rounded-md" />
                <span className="font-semibold">{p.name}</span>
                <span className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {p.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Product Preview Showcase */}
      <section id="preview" className="px-4 py-16 sm:py-24 bg-muted/30 border-y border-border relative">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              Interactive Product Demo
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              One Input. Four Tailored Native Posts.
            </h2>
            <p className="text-sm text-muted-foreground">
              Watch how SocialSync AI takes a single topic or video asset and formats native copy, hashtags, and CTA for each unique algorithm.
            </p>
          </div>

          {/* Interactive Card */}
          <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            {/* Window Top Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-4 py-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-rose-500/80" />
                <span className="size-3 rounded-full bg-amber-500/80" />
                <span className="size-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-muted-foreground">
                  socialsync.ai/live-composer
                </span>
              </div>

              {/* Platform Preview Tabs */}
              <div className="flex items-center gap-1 rounded-xl bg-background border border-border p-1">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePreviewTab(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activePreviewTab === p.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <PlatformIcon platform={p.id} className="size-3.5 rounded-xs" />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Left: Input Context */}
              <div className="lg:col-span-5 p-6 space-y-5 bg-background/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Content Theme / Topic
                  </label>
                  <textarea
                    rows={3}
                    value={demoPrompt}
                    onChange={(e) => setDemoPrompt(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Voice & Tone
                    </label>
                    <select
                      value={demoTone}
                      onChange={(e) => setDemoTone(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                    >
                      <option>Professional</option>
                      <option>Friendly & Conversational</option>
                      <option>Viral & Punchy</option>
                      <option>Educational</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Attached Media
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 text-xs text-muted-foreground">
                      <div className="size-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold">
                        MP4
                      </div>
                      <span className="truncate">product_launch.mp4 (14.2MB)</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={14} />
                    <span>Multimodal Vision Grounding</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Gemini 2.5 extracted 3 chronological keyframes, identified UI controls, and matched the tone to the audience expectations of {activePreviewTab}.
                  </p>
                </div>
              </div>

              {/* Right: Mock Preview Card */}
              <div className="lg:col-span-7 p-6 bg-card flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Mock Channel Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <PlatformIcon platform={activePreviewTab} className="size-8 rounded-lg shadow-xs" />
                      <div>
                        <p className="text-xs font-bold leading-tight">
                          {previewContent[activePreviewTab].account}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {previewContent[activePreviewTab].handle}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {activePreviewTab} Preview
                    </Badge>
                  </div>

                  {/* Mock Media Display */}
                  <div className="relative rounded-xl border border-border overflow-hidden bg-slate-900 aspect-video flex items-center justify-center text-white/80 group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    <div className="flex flex-col items-center gap-2 z-10">
                      <div className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play size={20} className="fill-white translate-x-0.5" />
                      </div>
                      <span className="text-xs font-medium tracking-wide">
                        1080p HD Video • 0:30
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10 text-[11px] text-white/90 font-medium">
                      {previewContent[activePreviewTab].likes}
                    </div>
                  </div>

                  {/* Generated Copy */}
                  <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2 relative">
                    <button
                      type="button"
                      onClick={copyDemoCaption}
                      className="absolute top-3 right-3 p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
                      title="Copy caption"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <p className="text-xs whitespace-pre-line leading-relaxed text-foreground pr-8">
                      {previewContent[activePreviewTab].caption}
                    </p>
                  </div>
                </div>

                {/* Footer status */}
                <div className="flex items-center justify-between pt-3 border-t border-border text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={13} /> Formatted for {activePreviewTab} algorithm
                  </span>
                  <Link href="/dashboard/create-post" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                    Edit & Publish Now →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="px-4 py-16 sm:py-24 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
            Commercial Capabilities
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Engineered for High-Velocity Growth
          </h2>
          <p className="text-sm text-muted-foreground">
            Everything your agency, product team, or personal brand needs to scale content without increasing headcount.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="relative overflow-hidden group hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="px-4 py-16 sm:py-24 bg-muted/20 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              Simple 3-Step Flow
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Publishing Made Effortless
            </h2>
            <p className="text-sm text-muted-foreground">
              From raw visual idea to published multi-network campaign in under two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((s, idx) => (
              <div key={s.num} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm relative">
                <span className="text-3xl font-black text-indigo-500/25 font-mono">
                  {s.num}
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  {s.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="px-4 py-20 max-w-5xl mx-auto text-center">
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-card to-background p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
            Ready to Multiply Your Reach Across Every Network?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Join modern creators, tech founders, and marketing teams automating their content engine with SocialSync AI.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button variant="stitch" size="lg" className="gap-2 shadow-lg shadow-indigo-500/30">
                <span>Create Your Account</span>
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/60 px-4 py-12 mt-auto text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles size={14} />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">
              SocialSync AI
            </span>
            <span className="text-muted-foreground/60">• © 2026 SocialSync Inc.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/create-post" className="hover:text-foreground transition-colors">
              Create Post
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
