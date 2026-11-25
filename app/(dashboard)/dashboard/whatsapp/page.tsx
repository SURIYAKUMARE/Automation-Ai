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
  Plus,
  Play,
  Square,
  LogOut,
  Trash2,
  Globe,
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
  const [isOnline, setIsOnline] = React.useState(false);
  const [apiUrl, setApiUrl] = React.useState("");
  const [dashboardUrl, setDashboardUrl] = React.useState("");
  const [activeSession, setActiveSession] = React.useState<OpenWaSession | null>(null);
  const [sessions, setSessions] = React.useState<OpenWaSession[]>([]);

  // Multi-device Session & Pairing State
  const [newSessionName, setNewSessionName] = React.useState("");
  const [isCreatingSession, setIsCreatingSession] = React.useState(false);
  const [sessionBusyId, setSessionBusyId] = React.useState<string | null>(null);
  const [pairingSessionId, setPairingSessionId] = React.useState<string | null>(null);
  const [qrImage, setQrImage] = React.useState<string | null>(null);
  const [qrError, setQrError] = React.useState<string | null>(null);
  const [pairingPhone, setPairingPhone] = React.useState("");
  const [pairingCode, setPairingCode] = React.useState<string | null>(null);
  const [isRequestingCode, setIsRequestingCode] = React.useState(false);

  // Gateway URL Config State
  const [gatewayInput, setGatewayInput] = React.useState("");
  const [isSavingGateway, setIsSavingGateway] = React.useState(false);

  // Transmission Logs
  const [logs, setLogs] = React.useState<TransmissionLog[]>([]);

  const fetchStatus = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setIsOnline(Boolean(data.online));
        if (data.apiUrl) {
          setApiUrl(data.apiUrl);
          setGatewayInput((prev) => prev || data.apiUrl);
        }
        if (data.dashboardUrl) setDashboardUrl(data.dashboardUrl);
        setActiveSession(data.activeSession || null);
        if (Array.isArray(data.sessions)) setSessions(data.sessions);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSessionName.trim() || `device-${Date.now().toString().slice(-4)}`;
    setIsCreatingSession(true);
    const notice = toast.loading(`Creating WhatsApp session "${cleanName}"...`);
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      toast.success(`Session "${data.session.name}" created! Scan QR or enter phone to link.`, { id: notice });
      setNewSessionName("");
      setPairingSessionId(data.session.id);
      setQrImage(null);
      setPairingCode(null);
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create session", { id: notice });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSessionAction = async (sessionId: string, action: "start" | "stop" | "logout" | "delete") => {
    setSessionBusyId(sessionId);
    const notice = toast.loading(`Running ${action} on session...`);
    try {
      const res = await fetch(`/api/whatsapp/sessions/${encodeURIComponent(sessionId)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} session`);
      toast.success(`Session ${action} completed`, { id: notice });
      if (action === "delete" && pairingSessionId === sessionId) {
        setPairingSessionId(null);
        setQrImage(null);
        setPairingCode(null);
      }
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Session action failed", { id: notice });
    } finally {
      setSessionBusyId(null);
    }
  };

  const fetchQRForSession = React.useCallback(async (sessionId: string) => {
    setQrError(null);
    try {
      const res = await fetch(`/api/whatsapp/sessions/${encodeURIComponent(sessionId)}/qr`);
      const data = await res.json();
      if (!res.ok) {
        setQrError(data.error || "QR code not ready yet");
        return;
      }
      const raw = data.qrCode || data.qr || data.raw;
      if (typeof raw === "string" && raw) {
        if (raw.startsWith("data:image/")) {
          setQrImage(raw);
        } else {
          setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(raw)}`);
        }
      }
    } catch {
      setQrError("Could not fetch QR code");
    }
  }, []);

  React.useEffect(() => {
    if (!pairingSessionId || activeTab !== "sessions") return;
    void fetchQRForSession(pairingSessionId);
    const timer = window.setInterval(() => {
      void fetchQRForSession(pairingSessionId);
      void fetchStatus();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pairingSessionId, activeTab, fetchQRForSession, fetchStatus]);

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingSessionId || !pairingPhone.trim()) {
      toast.error("Select a session and enter your WhatsApp phone number with country code.");
      return;
    }
    setIsRequestingCode(true);
    const notice = toast.loading("Requesting 8-digit pairing code...");
    try {
      const res = await fetch(`/api/whatsapp/sessions/${encodeURIComponent(pairingSessionId)}/pairing-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: pairingPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not get pairing code");
      const code = data.code || data.pairingCode;
      setPairingCode(code || null);
      toast.success("Pairing code generated! Enter it in WhatsApp → Linked Devices.", { id: notice });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pairing code failed", { id: notice });
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayInput.trim()) return;
    setIsSavingGateway(true);
    const notice = toast.loading("Connecting to OpenWA Gateway...");
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl: gatewayInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save gateway URL");
      setIsOnline(Boolean(data.status?.online));
      if (data.status?.apiUrl) setApiUrl(data.status.apiUrl);
      setActiveSession(data.status?.activeSession || null);
      if (Array.isArray(data.status?.sessions)) setSessions(data.status.sessions);
      if (data.status?.online) {
        toast.success("OpenWA Gateway connected across all devices!", { id: notice });
      } else {
        toast.warning(`Saved URL, but gateway at ${gatewayInput.trim()} is currently unreachable.`, { id: notice });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save gateway URL", { id: notice });
    } finally {
      setIsSavingGateway(false);
    }
  };

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
                    <span>OpenWA Sessions ({sessions.length})</span>
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
                  Manage and pair WhatsApp devices from any phone, tablet, or browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Create New Session */}
                <form onSubmit={handleCreateSession} className="flex items-center gap-2">
                  <Input
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="New session name (e.g. sales-phone)"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreatingSession || !isOnline}
                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>{isCreatingSession ? "Creating..." : "Add Device"}</span>
                  </Button>
                </form>

                {sessions.length > 0 ? (
                  <div className="space-y-2.5">
                    {sessions.map((sess) => {
                      const isReady = sess.status === "ready";
                      const busy = sessionBusyId === sess.id;
                      return (
                        <div
                          key={sess.id}
                          className={cn(
                            "p-3.5 rounded-xl border space-y-2.5",
                            isReady
                              ? "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20"
                              : "border-border bg-muted/20"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="size-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-semibold text-xs">
                                WA
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                                  <span>{sess.name}</span>
                                  <Badge
                                    className={cn(
                                      "text-[10px] px-1.5 py-0 text-white",
                                      isReady ? "bg-emerald-600" : "bg-amber-600"
                                    )}
                                  >
                                    {sess.status.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {sess.phone ? `+${sess.phone}` : "Not linked yet"}{" "}
                                  {sess.pushName ? `(${sess.pushName})` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!isReady && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setPairingSessionId(sess.id);
                                    setQrImage(null);
                                    setPairingCode(null);
                                  }}
                                  className="h-7 text-[11px] px-2 gap-1 cursor-pointer text-indigo-600 border-indigo-500/30"
                                >
                                  <QrCode className="size-3" />
                                  <span>Pair</span>
                                </Button>
                              )}
                              {!isReady ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void handleSessionAction(sess.id, "start")}
                                  className="h-7 text-[11px] px-2 gap-1 cursor-pointer"
                                >
                                  <Play className="size-3" />
                                  <span>Start</span>
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void handleSessionAction(sess.id, "stop")}
                                  className="h-7 text-[11px] px-2 gap-1 cursor-pointer"
                                >
                                  <Square className="size-3" />
                                  <span>Stop</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void handleSessionAction(sess.id, "logout")}
                                title="Unlink WhatsApp"
                                className="h-7 text-[11px] px-2 cursor-pointer"
                              >
                                <LogOut className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void handleSessionAction(sess.id, "delete")}
                                title="Delete session"
                                className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs space-y-2">
                    <AlertCircle className="size-6 text-amber-500 mx-auto" />
                    <p className="font-medium text-foreground">
                      {isOnline ? "No WhatsApp sessions found" : "OpenWA Gateway is offline"}
                    </p>
                    <p className="text-[11px]">
                      {isOnline
                        ? "Click 'Add Device' above to create a session and pair your WhatsApp."
                        : "Ensure OpenWA is running and configure its public Gateway URL on the right."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Inline QR & Phone Pairing Card */}
            <Card className="border border-border bg-card shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <QrCode className="size-4 text-indigo-600" />
                  <span>Link WhatsApp (Any Device)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Scan QR code or use an 8-digit phone pairing code right here.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                {pairingSessionId ? (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-white">
                      {qrImage ? (
                        <img src={qrImage} alt="WhatsApp QR Code" className="size-48 object-contain" />
                      ) : (
                        <div className="size-48 flex flex-col items-center justify-center text-slate-500 text-center px-4 gap-2">
                          <RefreshCw className="size-5 animate-spin text-indigo-600" />
                          <span className="text-[11px]">
                            {qrError || "Waiting for OpenWA QR code..."}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border space-y-2">
                      <p className="text-[11px] font-medium text-foreground">
                        On a single phone? Link with phone number instead:
                      </p>
                      <form onSubmit={handleRequestPairingCode} className="flex gap-2">
                        <Input
                          value={pairingPhone}
                          onChange={(e) => setPairingPhone(e.target.value)}
                          placeholder="e.g. 919445648373"
                          className="h-8 text-xs font-mono"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isRequestingCode}
                          className="h-8 text-xs shrink-0 cursor-pointer"
                        >
                          {isRequestingCode ? "Getting..." : "Get Code"}
                        </Button>
                      </form>
                      {pairingCode && (
                        <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-500/30 text-center">
                          <span className="text-[10px] text-muted-foreground block">
                            WhatsApp → Linked Devices → Link with phone number:
                          </span>
                          <code className="text-base font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                            {pairingCode}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    Click <strong>Add Device</strong> or click <strong>Pair</strong> on any unlinked session to display its QR code and phone pairing code here.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Remote Gateway URL Configuration */}
            <Card className="border border-border bg-card shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-emerald-600" />
                  <span>Multi-Device Gateway URL</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Syncs your OpenWA Gateway URL across Vercel, mobile phones, and all browsers.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5 text-xs">
                <form onSubmit={handleSaveGateway} className="space-y-2">
                  <Input
                    value={gatewayInput}
                    onChange={(e) => setGatewayInput(e.target.value)}
                    placeholder="https://your-openwa-url.example.com"
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingGateway}
                    className="w-full h-8 text-xs font-semibold cursor-pointer"
                  >
                    {isSavingGateway ? "Saving & Testing..." : "Save & Connect Gateway"}
                  </Button>
                </form>
                <p className="text-[11px] text-muted-foreground">
                  Active URL: <code className="font-mono text-foreground break-all">{apiUrl || "Not configured"}</code>
                </p>
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
