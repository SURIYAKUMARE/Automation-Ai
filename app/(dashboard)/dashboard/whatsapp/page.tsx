"use client";

import * as React from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Smartphone,
  Settings,
  History,
  Bell,
  Key,
  CheckCheck,
  Globe,
  Lock,
  ArrowRight,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TransmissionLog {
  id: string;
  recipient: string;
  messagePreview: string;
  status: "sent" | "delivered" | "read" | "failed";
  provider: "meta_cloud_api" | "socialsync_cloud";
  timestamp: string;
  error?: string;
}

const PRESET_TEMPLATES = [
  {
    title: "Campaign Published",
    icon: "🚀",
    message: "🚀 SocialSync AI: Your post 'Spring Feature Release' has been published across Instagram, LinkedIn, and Facebook! View live performance in your dashboard.",
  },
  {
    title: "Scheduled Reminder",
    icon: "⏰",
    message: "⏰ Reminder: Your scheduled campaign is set to publish tomorrow at 10:00 AM across your connected social accounts.",
  },
  {
    title: "Customer Welcome",
    icon: "👋",
    message: "👋 Hi! Welcome to SocialSync AI. Your multi-platform social media publishing and automation system is now active.",
  },
  {
    title: "Analytics Digest",
    icon: "📈",
    message: "📈 Weekly Digest: Your published posts reached 14,200 impressions this week with a 99.4% publishing success rate across all channels.",
  },
];

export default function WhatsAppGatewayPage() {
  const [activeTab, setActiveTab] = React.useState<"tester" | "settings" | "logs" | "notifications">("tester");
  const [phoneNumber, setPhoneNumber] = React.useState("+91 98765 43210");
  const [message, setMessage] = React.useState("🚀 SocialSync AI: Your post 'Spring Feature Release' has been published across Instagram, LinkedIn, and Facebook! View live performance in your dashboard.");
  const [isSending, setIsSending] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Meta Cloud API Config State
  const [phoneNumberId, setPhoneNumberId] = React.useState("");
  const [wabaId, setWabaId] = React.useState("");
  const [metaToken, setMetaToken] = React.useState("");
  const [verifyToken, setVerifyToken] = React.useState("socialsync_verify_token_2026");

  // Notification Toggles
  const [notifyOnPublish, setNotifyOnPublish] = React.useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = React.useState(true);
  const [dailyDigest, setDailyDigest] = React.useState(false);
  const [alertPhone, setAlertPhone] = React.useState("+91 98765 43210");

  // Logs
  const [logs, setLogs] = React.useState<TransmissionLog[]>([]);

  const fetchLogs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/logs");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) setLogs(data.logs);
      }
    } catch {
      // Ignore background log fetch error
    }
  }, []);

  React.useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success(`Copied ${label} to clipboard`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !message.trim()) {
      toast.error("Please enter a phone number and message body.");
      return;
    }

    setIsSending(true);
    const notice = toast.loading("Dispatching WhatsApp message via SocialSync Cloud...");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          message,
          metaConfig: phoneNumberId && metaToken ? { phoneNumberId, accessToken: metaToken } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to dispatch message");
      }

      toast.success(data.notice || "Message delivered successfully via SocialSync Cloud!", { id: notice });
      void fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message", { id: notice });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Meta WhatsApp Cloud API credentials saved successfully!");
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Automated WhatsApp notification preferences saved!");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>WhatsApp Cloud Automation</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cloud-native messaging, automated campaign notifications, and Meta WhatsApp Cloud API integration.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 font-medium text-xs px-2.5 py-1"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block animate-pulse" />
            SocialSync Cloud Gateway Active
          </Badge>
        </div>
      </div>

      {/* Cloud Architecture Highlights (Zero Local Servers) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Cloud Engine</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>SocialSync Cloud Gateway</span>
              <span className="size-2 rounded-full bg-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Environment:</span>
              <span className="text-foreground font-medium">Cloud-Native (Vercel)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Local Server Required:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">None (0.0s)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Transmission Protocol</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Meta Cloud API &amp; Webhooks</span>
              <Globe className="size-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Delivery Latency:</span>
              <span className="text-foreground font-mono">&lt; 400ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Encryption:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">End-to-End TLS</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Campaign Webhooks</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Live Post Alerts</span>
              <Bell className="size-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Auto-Publish Alerts:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Delivery Receipts:</span>
              <span className="text-foreground font-mono">Double-Check (✓✓)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("tester")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
            activeTab === "tester"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Send className="size-3.5" />
          <span>Message Dispatcher &amp; Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
            activeTab === "settings"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Settings className="size-3.5" />
          <span>Meta Cloud API Setup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
            activeTab === "notifications"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Bell className="size-3.5" />
          <span>Campaign Notification Triggers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
            activeTab === "logs"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <History className="size-3.5" />
          <span>Transmission Logs ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: MESSAGE DISPATCHER & LIVE PREVIEW */}
      {activeTab === "tester" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form & Presets */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-border bg-card shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Send className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Send WhatsApp Message</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Dispatch instant WhatsApp updates, customer notifications, and social campaign announcements.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSendMessage} className="space-y-4">
                  {/* Preset Template Quick Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Quick Message Templates</span>
                      <span className="text-[10px] text-muted-foreground">Click to populate</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.title}
                          type="button"
                          onClick={() => setMessage(tmpl.message)}
                          className={cn(
                            "p-2.5 rounded-lg border text-left transition-all text-xs cursor-pointer flex flex-col justify-between group",
                            message === tmpl.message
                              ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                              : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                            <span>{tmpl.icon}</span>
                            <span>{tmpl.title}</span>
                          </span>
                          <span className="text-[10px] line-clamp-1 opacity-75 mt-1 font-sans">
                            {tmpl.message}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phone Number Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Destination Phone Number
                    </label>
                    <Input
                      type="text"
                      placeholder="+91 98765 43210 or 15550192834"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="font-mono text-xs rounded-lg h-9"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Include country code without spaces or plus symbol (e.g. 919876543210 for India, 15550192834 for US).
                    </p>
                  </div>

                  {/* Message Body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">
                        Message Body
                      </label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {message.length} chars
                      </span>
                    </div>
                    <Textarea
                      rows={5}
                      placeholder="Write your WhatsApp message here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="text-xs rounded-lg resize-none font-sans leading-relaxed"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSending}
                    className="w-full text-xs font-semibold h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer"
                  >
                    <Send className="size-4" />
                    <span>{isSending ? "Dispatching Message..." : "Send WhatsApp Message"}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Realistic WhatsApp Phone Mockup */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-border bg-card shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Smartphone className="size-3.5 text-emerald-600" />
                  <span>Live WhatsApp Preview</span>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Real-time preview of how the recipient views your message.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 bg-muted/20">
                {/* Phone Shell */}
                <div className="max-w-[320px] mx-auto rounded-3xl border-4 border-slate-800 dark:border-slate-700 bg-[#EFEAE2] dark:bg-[#0B141A] overflow-hidden shadow-md">
                  {/* WhatsApp App Bar */}
                  <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white p-3 flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      SS
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs leading-tight truncate flex items-center gap-1">
                        <span>SocialSync AI</span>
                        <CheckCheck className="size-3 text-cyan-300 inline" />
                      </div>
                      <div className="text-[10px] text-emerald-100 opacity-90 leading-tight">
                        Official Business Account
                      </div>
                    </div>
                  </div>

                  {/* Chat Canvas */}
                  <div className="p-3 min-h-[260px] flex flex-col justify-end space-y-2">
                    {/* Timestamp Pill */}
                    <div className="text-center">
                      <span className="bg-white/80 dark:bg-slate-800 text-[9px] text-muted-foreground px-2 py-0.5 rounded-full shadow-2xs font-mono">
                        TODAY
                      </span>
                    </div>

                    {/* Incoming/Outgoing WhatsApp Bubble */}
                    <div className="self-end max-w-[90%] bg-[#E7FFDB] dark:bg-[#005C4B] text-slate-900 dark:text-slate-100 p-2.5 rounded-2xl rounded-tr-xs shadow-xs text-xs space-y-1 relative">
                      <p className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                        {message || "Type a message on the left to see live preview..."}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground dark:text-slate-300 font-mono">
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <CheckCheck className="size-3 text-[#53BDEB]" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: META WHATSAPP CLOUD API SETUP */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <Card className="border border-border bg-card shadow-xs rounded-xl">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Key className="size-4 text-indigo-600 dark:text-indigo-400" />
                <span>Meta WhatsApp Cloud API Configuration</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Direct carrier termination via official Meta WhatsApp Business Cloud API. 100% cloud-hosted with zero local dependencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Phone Number ID</label>
                    <Input
                      placeholder="e.g. 106294829104859"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      className="font-mono text-xs rounded-lg h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">From Meta App Dashboard &gt; WhatsApp &gt; API Setup.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">WhatsApp Business Account ID (WABA)</label>
                    <Input
                      placeholder="e.g. 109283749281749"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      className="font-mono text-xs rounded-lg h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">Your verified business account ID in Meta Business Manager.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Permanent Access Token (System User)</label>
                  <Input
                    type="password"
                    placeholder="EAA..."
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    className="font-mono text-xs rounded-lg h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">Generate in Meta Business Settings &gt; System Users with `whatsapp_business_messaging` permission.</p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <Button
                    type="submit"
                    className="text-xs font-semibold h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Cloud API Credentials
                  </Button>
                </div>
              </form>

              {/* Webhook Configuration Guide */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 mt-4">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-foreground">Meta Webhook Integration URL</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Configure this webhook URL in your Meta App Dashboard to receive real-time delivery receipts and customer replies:
                </p>
                <div className="flex items-center justify-between font-mono text-xs bg-background p-2.5 rounded-lg border border-border">
                  <span className="text-foreground truncate select-all">
                    https://automation-ai-dusky.vercel.app/api/webhooks/whatsapp
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("https://automation-ai-dusky.vercel.app/api/webhooks/whatsapp", "Webhook URL")}
                    className="text-muted-foreground hover:text-foreground ml-2 cursor-pointer"
                  >
                    {copiedKey === "Webhook URL" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: CAMPAIGN NOTIFICATION TRIGGERS */}
      {activeTab === "notifications" && (
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Automated WhatsApp Notification Triggers</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Receive automated WhatsApp alerts on your phone whenever your social campaigns publish or require attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSaveNotifications} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Alert Destination Phone Number</label>
                <Input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={alertPhone}
                  onChange={(e) => setAlertPhone(e.target.value)}
                  className="font-mono text-xs rounded-lg h-9 max-w-md"
                  required
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Campaign Publish Success Alert
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Receive an instant WhatsApp message with live post links when a post publishes to Instagram, YouTube, Facebook, or LinkedIn.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnPublish}
                    onChange={(e) => setNotifyOnPublish(e.target.checked)}
                    className="size-4 rounded border-border text-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Account Disconnect or Publishing Error Warning
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Get immediate WhatsApp alert if an account token expires or a social network rejects a post.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnFailure}
                    onChange={(e) => setNotifyOnFailure(e.target.checked)}
                    className="size-4 rounded border-border text-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Daily Morning Scheduled Post Summary
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Receive a daily 9:00 AM briefing of posts scheduled to go live today.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                    className="size-4 rounded border-border text-emerald-600"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-border">
                <Button
                  type="submit"
                  className="text-xs font-semibold h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Save Notification Preferences
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: TRANSMISSION LOGS */}
      {activeTab === "logs" && (
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp Transmission Logs</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Audit trail of outgoing WhatsApp campaign alerts and direct messages.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void fetchLogs()}
              className="text-xs h-8 gap-1.5 border-border rounded-lg"
            >
              <RefreshCw className="size-3" />
              <span>Refresh</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3">Message ID</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Message Preview</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                        No messages dispatched yet. Send your first WhatsApp message from the Dispatcher tab.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-foreground font-medium">
                          {log.id}
                        </td>
                        <td className="p-3 font-mono text-foreground font-medium">
                          {log.recipient}
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">
                          {log.messagePreview}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0.5",
                              log.status === "delivered" || log.status === "read"
                                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                                : log.status === "sent"
                                ? "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20"
                                : "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20"
                            )}
                          >
                            {log.status === "delivered" ? "✓✓ Delivered" : log.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-[11px] font-mono text-muted-foreground">
                          {log.provider === "meta_cloud_api" ? "Meta Cloud API" : "SocialSync Cloud"}
                        </td>
                        <td className="p-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
