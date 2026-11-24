"use client";

import * as React from "react";
import {
  MessageSquare,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Send,
  RefreshCw,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function WhatsAppGatewayPage() {
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [message, setMessage] = React.useState("Hello from SocialSync AI WhatsApp Gateway!");
  const [isSending, setIsSending] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [statusData, setStatusData] = React.useState<{ online: boolean; url: string; mode: string; message?: string } | null>(null);
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const openWaDashboardUrl = "http://localhost:2886";
  const openWaApiDocsUrl = "http://localhost:2785/api/docs";

  const checkStatus = React.useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setStatusData(data);
    } catch {
      setStatusData({ online: false, url: "http://localhost:2785", mode: "unknown", message: "Failed to query status" });
    } finally {
      setIsChecking(false);
    }
  }, []);

  React.useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !message.trim()) {
      toast.error("Please enter a phone number and message body.");
      return;
    }

    setIsSending(true);
    const notice = toast.loading("Sending WhatsApp message via OpenWA Gateway...");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, message }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not dispatch message");
      }

      if (data.delivered === false && data.notice) {
        toast.info(data.notice, { id: notice });
      } else {
        toast.success("Message dispatched via OpenWA Gateway!", { id: notice });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message", { id: notice });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="size-6 text-emerald-600 dark:text-emerald-400" />
              WhatsApp Automation Gateway
            </h1>
            <Badge
              variant="outline"
              className={
                statusData?.online
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-border text-muted-foreground bg-muted/30"
              }
            >
              {statusData?.online ? "Gateway Online" : "OpenWA Engine"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Self-hosted WhatsApp API and session manager for alerts, notifications, and scheduled customer messaging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            asChild
            className="text-xs h-9 gap-1.5 rounded-lg border-border"
          >
            <a href={openWaApiDocsUrl} target="_blank" rel="noopener noreferrer">
              <Terminal className="size-3.5" />
              <span>Swagger Docs</span>
              <ExternalLink className="size-3 opacity-60" />
            </a>
          </Button>

          <Button
            size="sm"
            asChild
            className="text-xs h-9 gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <a href={openWaDashboardUrl} target="_blank" rel="noopener noreferrer">
              <QrCode className="size-3.5" />
              <span>Open Dashboard (2886)</span>
              <ExternalLink className="size-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* Cloud Environment Notice (if accessed from Vercel) */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-3">
        <Globe2 className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-semibold">Localhost vs. Cloud Architecture</p>
          <p className="text-[11px] text-muted-foreground">
            OpenWA runs as a secure local daemon on your computer (`localhost:2785` and `localhost:2886`) to maintain your WhatsApp session in a headless browser. When using SocialSync AI, you can connect and scan your QR code directly by opening{" "}
            <a href={openWaDashboardUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 underline">
              http://localhost:2886
            </a>{" "}
            in your local browser.
          </p>
        </div>
      </div>

      {/* Status Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Gateway Engine</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>OpenWA v0.31</span>
              <span className={`size-2 rounded-full ${statusData?.online ? "bg-emerald-500" : "bg-emerald-500"}`} />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>API Endpoint:</span>
              <code className="text-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded text-[11px]">
                localhost:2785/api
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span>Swagger:</span>
              <code className="text-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded text-[11px]">
                /api/docs
              </code>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Web Interface</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Vite Dashboard</span>
              <span className="size-2 rounded-full bg-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Dashboard URL:</span>
              <a
                href={openWaDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] hover:underline"
              >
                localhost:2886
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active (Local)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Security &amp; Auth</CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Admin API Key</span>
              <ShieldCheck className="size-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <p className="text-[11px] text-muted-foreground">Local session key stored in:</p>
            <div className="flex items-center justify-between font-mono text-[11px] bg-muted/40 px-2 py-1 rounded border border-border">
              <span className="truncate">OpenWA/data/.api-key</span>
              <button
                type="button"
                onClick={() => copyToClipboard("OpenWA/data/.api-key", "path")}
                className="text-muted-foreground hover:text-foreground ml-1"
                title="Copy path"
              >
                {copiedText === "path" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Message Tester & Pair Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Quick Message Tester */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border border-border bg-card shadow-xs rounded-xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Send className="size-4 text-emerald-600 dark:text-emerald-400" />
                Quick Message Tester
              </CardTitle>
              <CardDescription className="text-xs">
                Test sending a WhatsApp message to any phone number through your local OpenWA gateway.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleSendMessage} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="wa-phone" className="text-xs font-medium text-foreground">
                    Destination Phone Number (with country code)
                  </label>
                  <Input
                    id="wa-phone"
                    type="tel"
                    placeholder="+91 98765 43210 or 919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-9 text-xs rounded-lg border-border"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Format: Country code + phone number without symbols (e.g. 919876543210).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="wa-message" className="text-xs font-medium text-foreground">
                    Message Body
                  </label>
                  <Textarea
                    id="wa-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your WhatsApp message here..."
                    className="text-xs rounded-lg resize-none leading-relaxed border-border"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-lg gap-1.5 shadow-xs"
                >
                  <Send className="size-3.5" />
                  <span>{isSending ? "Sending via OpenWA..." : "Send WhatsApp Message"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: How to Pair WhatsApp Account */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border border-border bg-card shadow-xs rounded-xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <QrCode className="size-4 text-emerald-600 dark:text-emerald-400" />
                How to Pair WhatsApp Account
              </CardTitle>
              <CardDescription className="text-xs">
                Follow these 3 simple steps to connect your WhatsApp phone number.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="size-6 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Open OpenWA Dashboard</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Click the <strong>Open Dashboard</strong> button above or go to{" "}
                    <a
                      href={openWaDashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-mono hover:underline font-semibold"
                    >
                      http://localhost:2886
                    </a>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="size-6 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Create Session &amp; Scan QR Code</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Click <strong>Add Session</strong>, select Baileys (lightweight) or whatsapp-web.js, and scan the QR code with WhatsApp on your phone (<strong>Settings &gt; Linked Devices &gt; Link a Device</strong>).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="size-6 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Automate Multi-Platform Messaging</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Once linked, you can send automated messages, notifications, and scheduled campaign follow-ups across WhatsApp directly from SocialSync AI.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 mt-4 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                  <AlertCircle className="size-3.5 text-amber-500" />
                  <span>Important Best Practice</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  For automated broadcasts and alerts, consider using a secondary SIM or customer service number to prevent personal account rate-limits.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
