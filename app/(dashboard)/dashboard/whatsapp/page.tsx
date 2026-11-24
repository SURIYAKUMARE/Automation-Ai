"use client";

import * as React from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  History,
  Key,
  CheckCheck,
  ExternalLink,
  QrCode,
  Radio,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OpenWaSession {
  id: string;
  name: string;
  status: string;
  phone?: string;
  pushName?: string;
  connectedAt?: string;
  lastActive?: string;
  engineLoaded?: boolean;
}

interface TransmissionLog {
  id: string;
  recipient: string;
  messagePreview: string;
  status: "sent" | "delivered" | "read" | "failed";
  provider: "openwa";
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

const OPENWA_API_KEY = "owa_k1_f898a06df01cf602a6c5fded1f9c6817e876a23ba2c0149902fb686b909740de";

export default function WhatsAppGatewayPage() {
  const [activeTab, setActiveTab] = React.useState<"tester" | "sessions" | "logs">("tester");
  const [phoneNumber, setPhoneNumber] = React.useState("+91 94456 48373");
  const [message, setMessage] = React.useState("🚀 SocialSync AI: Automated WhatsApp messaging is now 100% active and connected via OpenWA Gateway!");
  const [isSending, setIsSending] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // OpenWA Status State
  const [isOnline, setIsOnline] = React.useState(true);
  const [apiUrl, setApiUrl] = React.useState("http://localhost:2785");
  const [dashboardUrl, setDashboardUrl] = React.useState("http://localhost:2886");
  const [activeSession, setActiveSession] = React.useState<OpenWaSession | null>({
    id: "f2fbca5e-9229-4094-8970-f69c014d270c",
    name: "whatsapp-1",
    status: "ready",
    phone: "919445648373",
    pushName: "surya",
    engineLoaded: true,
  });
  const [sessions, setSessions] = React.useState<OpenWaSession[]>([]);

  // Transmission Logs
  const [logs, setLogs] = React.useState<TransmissionLog[]>([]);

  const fetchStatus = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setIsOnline(Boolean(data.online));
        if (data.apiUrl) setApiUrl(data.apiUrl);
        if (data.dashboardUrl) setDashboardUrl(data.dashboardUrl);
        if (data.activeSession) setActiveSession(data.activeSession);
        if (Array.isArray(data.sessions)) setSessions(data.sessions);
      }
    } catch {
      // Keep optimistic status
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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
    void fetchStatus();
    void fetchLogs();
  }, [fetchStatus, fetchLogs]);

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
    const notice = toast.loading("Dispatching WhatsApp message via OpenWA Gateway...");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          message,
          sessionId: activeSession?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to dispatch message");
      }

      toast.success(data.notice || "Message sent successfully via OpenWA!", { id: notice });
      void fetchLogs();
      void fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message", { id: notice });
    } finally {
      setIsSending(false);
    }
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
                <span>WhatsApp OpenWA Gateway</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Self-hosted WhatsApp API Gateway powered by OpenWA and Baileys WebSocket engine.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchStatus()}
            disabled={isRefreshing}
            className="h-8 text-xs font-medium gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            <span>Refresh Status</span>
          </Button>

          <Badge
            variant="outline"
            className={cn(
              "font-medium text-xs px-2.5 py-1",
              isOnline && activeSession?.status === "ready"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full mr-1.5 inline-block",
                isOnline && activeSession?.status === "ready" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              )}
            />
            {isOnline && activeSession?.status === "ready"
              ? `Connected (${activeSession.name})`
              : "OpenWA Starting / Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Gateway Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gateway Engine */}
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Gateway Engine</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>OpenWA v0.31.0</span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-normal">
                <Radio className="size-3 text-emerald-500 animate-pulse" />
                Active
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>API Endpoint:</span>
              <code className="text-[11px] font-mono text-foreground font-semibold">{apiUrl}</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Swagger API Docs:</span>
              <a
                href={`${apiUrl}/api/docs`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-500 text-[11px] flex items-center gap-1 font-mono font-medium"
              >
                <span>/api/docs</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Web Interface */}
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Web Interface</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>OpenWA Dashboard</span>
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1 font-normal"
              >
                <span>Open Dashboard</span>
                <ExternalLink className="size-3" />
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Dashboard URL:</span>
              <code className="text-[11px] font-mono text-foreground">{dashboardUrl}</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Session:</span>
              <span className="text-foreground font-semibold">
                {activeSession ? `${activeSession.name} (${activeSession.phone || "Active"})` : "No session"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* API Authentication */}
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Authentication</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Admin API Key</span>
              <button
                type="button"
                onClick={() => copyToClipboard(OPENWA_API_KEY, "API Key")}
                className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "API Key" ? <Check className="size-3" /> : <Copy className="size-3" />}
                <span>{copiedKey === "API Key" ? "Copied" : "Copy Key"}</span>
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Key:</span>
              <code className="text-[10px] font-mono text-foreground truncate max-w-[170px]">
                {OPENWA_API_KEY.slice(0, 16)}...
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span>Header:</span>
              <span className="font-mono text-[11px] text-foreground font-medium">X-Api-Key</span>
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
          <span>Quick Message Tester</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
            activeTab === "sessions"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Server className="size-3.5" />
          <span>OpenWA Sessions &amp; Pairing</span>
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

      {/* TAB 1: QUICK MESSAGE TESTER */}
      {activeTab === "tester" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form & Presets */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-border bg-card shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Send className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Send WhatsApp Message via OpenWA</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Test sending real WhatsApp messages to any phone number using the active OpenWA session.
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

                  {/* Destination Phone Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Destination Phone Number (with Country Code)</span>
                      <span className="text-[10px] text-muted-foreground">e.g. +91 94456 48373</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="+91 94456 48373 or 919445648373"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="font-mono text-xs h-9"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      International format with country code (e.g. +91 for India, +1 for US). Spaces and dashes are cleaned automatically.
                    </p>
                  </div>

                  {/* Message Body Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Message Content</span>
                      <span className="text-[10px] text-muted-foreground">{message.length} chars</span>
                    </label>
                    <Textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your WhatsApp notification message here..."
                      className="text-xs resize-none"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={isSending || !isOnline}
                      className="w-full h-10 text-xs font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                    >
                      <Send className="size-4" />
                      <span>{isSending ? "Dispatching via OpenWA..." : "Send WhatsApp Message"}</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Realistic iPhone WhatsApp Mockup */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-[300px] sm:w-[320px] rounded-[38px] border-[8px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-slate-800">
              {/* Speaker / Camera Notch */}
              <div className="h-6 bg-slate-900 flex items-center justify-center relative">
                <div className="w-20 h-4 bg-black rounded-b-xl flex items-center justify-center">
                  <div className="size-2 rounded-full bg-slate-800/80 mr-3" />
                  <div className="size-1.5 rounded-full bg-slate-700/80" />
                </div>
              </div>

              {/* WhatsApp App Header */}
              <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center text-xs font-bold text-white uppercase">
                    SS
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold leading-tight flex items-center gap-1">
                      <span>SocialSync Gateway</span>
                      <span className="size-1.5 rounded-full bg-emerald-300" />
                    </h3>
                    <p className="text-[9px] text-emerald-100 font-normal">
                      {activeSession ? `${activeSession.name} • Online` : "OpenWA Gateway"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Wallpaper Canvas */}
              <div
                className="h-[340px] p-3 flex flex-col justify-end space-y-2 overflow-y-auto"
                style={{
                  backgroundColor: "#efeae2",
                  backgroundImage: "radial-gradient(#d1d7db 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              >
                {/* Outgoing Message Bubble */}
                <div className="self-end max-w-[85%] bg-[#d9fdd3] text-slate-900 text-xs rounded-xl rounded-tr-none p-2.5 shadow-xs border border-emerald-200/50 space-y-1">
                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                    {message || "Type a message on the left to see live preview..."}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-mono">
                    <span>
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <CheckCheck className="size-3.5 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Home Indicator */}
              <div className="h-4 bg-slate-900 flex items-center justify-center">
                <div className="w-24 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-emerald-600" />
              <span>Real-time delivery preview with Blue Double Checks (✓✓)</span>
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: SESSIONS & PAIRING */}
      {activeTab === "sessions" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-border bg-card shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Connected OpenWA Sessions</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchStatus()}
                    className="h-7 text-xs font-medium cursor-pointer"
                  >
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">
                  Active WhatsApp sessions running inside your local OpenWA instance.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {activeSession ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-semibold text-xs">
                          WA
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                            <span>{activeSession.name}</span>
                            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                              {activeSession.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Phone: +{activeSession.phone || "Linked"} {activeSession.pushName ? `(${activeSession.pushName})` : ""}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`${dashboardUrl}/sessions`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                      >
                        <span>Manage</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Engine:</span>{" "}
                        <span className="font-semibold text-foreground">Baileys WebSocket</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Session ID:</span>{" "}
                        <code className="font-mono text-[10px] text-foreground truncate">{activeSession.id.slice(0, 12)}...</code>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs space-y-2">
                    <AlertCircle className="size-6 text-amber-500 mx-auto" />
                    <p className="font-medium text-foreground">No active WhatsApp session</p>
                    <p className="text-[11px]">Open the OpenWA Dashboard at {dashboardUrl} and scan the QR code to connect your number.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-border bg-card shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <QrCode className="size-4 text-indigo-600" />
                  <span>How to Pair WhatsApp Account</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Simple 3-step setup to connect any WhatsApp number to OpenWA.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs leading-relaxed">
                <div className="flex gap-2.5">
                  <div className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Open OpenWA Dashboard:</span>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Navigate to{" "}
                      <a
                        href={dashboardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline font-mono"
                      >
                        {dashboardUrl}
                      </a>{" "}
                      in your browser.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Create Session &amp; Scan QR:</span>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Click <strong>New Session</strong>, choose <strong>Baileys</strong> engine, and scan the QR code with WhatsApp on your phone (<em>Settings &gt; Linked Devices &gt; Link a Device</em>).
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Ready for Automated Messaging:</span>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Your session links instantly. SocialSync can now dispatch messages, scheduled broadcasts, and customer updates directly through OpenWA!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSMISSION LOGS */}
      {activeTab === "logs" && (
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>OpenWA Transmission History</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time log of recent messages dispatched via the OpenWA REST API.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchLogs()}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              <span>Refresh Logs</span>
            </Button>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <p>No messages sent yet. Use the Quick Message Tester to send your first message.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-muted/20 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-semibold text-foreground">{log.recipient}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-medium",
                            log.status === "delivered"
                              ? "border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                              : "border-red-500/30 text-red-600 bg-red-50"
                          )}
                        >
                          {log.status === "delivered" ? "DELIVERED ✓✓" : "FAILED"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] line-clamp-1">{log.messagePreview}</p>
                      {log.error && <p className="text-red-500 text-[10px]">{log.error}</p>}
                    </div>

                    <div className="text-right text-[10px] text-muted-foreground font-mono shrink-0">
                      <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-[9px] text-muted-foreground/80">{log.id.slice(0, 14)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
