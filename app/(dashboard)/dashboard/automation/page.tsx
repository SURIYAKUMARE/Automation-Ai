"use client";

import * as React from "react";
import {
  Sliders,
  Sparkles,
  Shield,
  Save,
  Check,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform } from "@/types";

export default function AutomationSettingsPage() {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [defaultMode, setDefaultMode] = React.useState<"automatic" | "manual_approval">("manual_approval");
  const [defaultLanguage, setDefaultLanguage] = React.useState("English");
  const [defaultTone, setDefaultTone] = React.useState("Professional");
  const [enabledPlatforms, setEnabledPlatforms] = React.useState<SocialPlatform[]>(["linkedin", "instagram"]);
  const [requireReviewForVideos, setRequireReviewForVideos] = React.useState(true);
  const [delayMinutes, setDelayMinutes] = React.useState(5);
  const [isSaving, setIsSaving] = React.useState(false);

  const togglePlatform = (p: SocialPlatform) => {
    setEnabledPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "00000000-0000-0000-0000-000000000001",
          isEnabled,
          defaultMode,
          defaultLanguage,
          defaultTone,
          enabledPlatforms,
          requireReviewForVideos,
          delayMinutesBeforePublish: Number(delayMinutes),
        }),
      });

      if (!res.ok) throw new Error("Failed saving automation rules");

      toast.success("Automation rules saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update rules");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            Automation Rules & Safeguards
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure Mode A autonomous publishing, platform routing, and quality guardrails.
          </p>
        </div>

        <Button variant="stitch" size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Autonomous Engine */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Autonomous Engine (Mode A)
            </CardTitle>
            <CardDescription>Upload → Analyze → Synthesize → Validate → Publish</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground">Enable Fully Automatic Mode</span>
                <p className="text-[11px] text-muted-foreground">
                  Skip manual review and broadcast directly upon media upload & AI generation
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-muted-foreground">Default Publishing Mode:</label>
              <select
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value as any)}
                className="w-full rounded-lg border border-input bg-card p-2 text-foreground"
              >
                <option value="manual_approval">Manual Approval (Recommended - Hold in Review)</option>
                <option value="automatic">Fully Automatic (Instant Multi-Platform Broadcast)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Default Language:</label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card p-2 text-foreground"
                >
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Tanglish">Tanglish</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Default Tone:</label>
                <select
                  value={defaultTone}
                  onChange={(e) => setDefaultTone(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card p-2 text-foreground"
                >
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Creative">Creative</option>
                  <option value="Minimal">Minimal</option>
                  <option value="Promotional">Promotional</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safeguards and Timing */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              Safety Safeguards & Timing
            </CardTitle>
            <CardDescription>Prevent unintended publishing and rate-limit violations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground">Require Manual Review for Videos</span>
                <p className="text-[11px] text-muted-foreground">Always review YouTube uploads and Instagram Reels</p>
              </div>
              <Switch checked={requireReviewForVideos} onCheckedChange={setRequireReviewForVideos} />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-muted-foreground">Delay Buffer Before Broadcast (Minutes):</label>
              <Input
                type="number"
                min={0}
                max={120}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Grace period window allowing you to cancel or edit before background worker executes
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-muted-foreground">Auto-Eligible Platforms:</label>
              <div className="grid grid-cols-2 gap-2">
                {(["linkedin", "youtube", "instagram", "facebook"] as SocialPlatform[]).map((p) => {
                  const active = enabledPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs capitalize ${
                        active
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <span>{p}</span>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
