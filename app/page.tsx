import Link from "next/link";
import {
  Zap,
  Sparkles,
  Share2,
  ShieldCheck,
  Send,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "@/components/platform-icon";

export default function LandingPage() {
  const features = [
    {
      icon: Sparkles,
      title: "Google Gemini Multimodal AI",
      desc: "Instant image & video frame analysis with OCR text extraction. Generates tailored captions, hashtags, and titles for each network.",
    },
    {
      icon: Share2,
      title: "4 Official OAuth 2.0 Adapters",
      desc: "Direct integration with official REST APIs for LinkedIn, YouTube, Instagram (Content Publishing API), and Facebook Pages.",
    },
    {
      icon: Zap,
      title: "Two Autonomous Publishing Modes",
      desc: "Choose Mode A for Fully Automatic hands-free broadcasting, or Mode B for human-in-the-loop Manual Review & Approval.",
    },
    {
      icon: ShieldCheck,
      title: "Hardware-Grade Security",
      desc: "AES-256-GCM token encryption at rest with strict Supabase Row Level Security (RLS) ensuring 100% tenant data isolation.",
    },
    {
      icon: Clock,
      title: "Precision Scheduling Engine",
      desc: "Schedule posts across platforms with UTC conversion, idempotency keys, and automated failure retries.",
    },
    {
      icon: TrendingUp,
      title: "Real API Engagement Metrics",
      desc: "Audit logs, live post permalinks, and official metric tracking without fabricated or simulated data.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon.png"
            alt="SocialFlow AI Logo"
            className="h-9 w-9 rounded-xl object-contain shadow-sm"
          />
          <span className="font-bold text-lg tracking-tight">
            SocialFlow <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 bg-clip-text text-transparent">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard/scripts" className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2 py-1 rounded-md hover:bg-muted">
            Script Studio
          </Link>
          <Link href="/dashboard/whatsapp" className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2 py-1 rounded-md hover:bg-muted">
            WhatsApp
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="stitch" size="sm" className="text-xs gap-1.5 shadow-sm">
              <span>Open Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center max-w-5xl mx-auto overflow-hidden">
        {/* Ambient radial glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="SocialFlow AI - Create • Schedule • Publish • Grow"
            className="h-28 sm:h-36 object-contain rounded-2xl shadow-xl border border-border/40 bg-card/80 p-2 backdrop-blur-sm"
          />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Final Year Major Project • Google Blue Design System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Intelligent Multi-Platform <br />
          <span className="bg-gradient-to-r from-blue-500 via-sky-300 to-blue-200 bg-clip-text text-transparent">
            Social Media Automation
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Upload media once. Google Gemini AI understands your visual context, generates optimized captions in English, Tamil, or Tanglish, and publishes to LinkedIn, YouTube, Instagram, and Facebook using official APIs.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link href="/dashboard">
            <Button variant="stitch" size="lg" className="gap-2 shadow-lg shadow-blue-500/30">
              <span>Launch Live Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/caption-studio">
            <Button variant="outline" size="lg" className="gap-2 border-blue-500/30 hover:bg-blue-500/10">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span>Explore AI Studio</span>
            </Button>
          </Link>
        </div>

        {/* Supported Official Platforms Banner */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {[
            { id: "linkedin", name: "LinkedIn", note: "UGC REST API" },
            { id: "youtube", name: "YouTube", note: "Data API v3" },
            { id: "instagram", name: "Instagram", note: "Content Publishing API" },
            { id: "facebook", name: "Facebook", note: "Meta Graph API" },
          ].map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-border/80 bg-card/80 backdrop-blur-sm shadow-sm hover:border-indigo-500/40 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/60 p-1 shrink-0">
                <PlatformIcon platform={p.id} className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground leading-tight">{p.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{p.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live System Specs Pill */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Gemini 1.5 Flash Vision
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> AES-256-GCM Tokens
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 12 RLS PostgreSQL Tables
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Official OAuth Handlers
          </span>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 bg-card/40 border-y border-border/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Engineered for Production Rigor</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Every integration connects to real provider endpoints with official permissions and error recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Card key={i} className="border-border/80 bg-card hover:border-indigo-500/40 transition-all">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{feat.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/80 py-8 px-4 text-center text-xs text-muted-foreground">
        <p>
          SocialFlow AI — Intelligent Multi-Platform Social Media Automation System • Powered by Google Gemini & Next.js
        </p>
      </footer>
    </div>
  );
}
