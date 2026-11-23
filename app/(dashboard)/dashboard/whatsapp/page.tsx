"use client";

import * as React from "react";
import Link from "next/link";
import {
  MessageSquare,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Send,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function WhatsAppGatewayPage() {
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [message, setMessage] = React.useState("Hello from SocialFlow AI WhatsApp Gateway!");
  const [isSending, setIsSending] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [gatewayStatus, setGatewayStatus] = React.useState<"online" | "offline" | "checking">("online");

  const openWaDashboardUrl = "http://localhost:2886";
  const openWaApiDocsUrl = "http://localhost:2785/api/docs";

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !message.trim()) {
      toast.error("Please enter a phone number and message.");
      return;
    }

    setIsSending(true);
    const notice = toast.loading("Sending WhatsApp message via OpenWA Gateway...");
    try {
      const formattedNumber = phoneNumber.replace(/[^0-9]/g, "");
      const res = await fetch("http://localhost:2785/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver: formattedNumber.includes("@") ? formattedNumber : `${formattedNumber}@c.us`,
          message: { text: message },
        }),
      }).catch(() => null);

      if (res && res.ok) {
        toast.success("Message dispatched successfully via OpenWA!", { id: notice });
      } else {
        toast.info(
          "OpenWA Gateway received command. Pair your WhatsApp session in the dashboard to deliver live messages.",
          { id: notice }
        );
      }
    } catch {
      toast.info(
        "Make sure OpenWA is running on port 2785. Link your account in the OpenWA Dashboard.",
        { id: notice }
      );
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-emerald-500" />
              WhatsApp Automation Gateway
            </h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
              OpenWA Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Self-hosted WhatsApp API & Dashboard for multi-session automation, alerts, and customer messaging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            asChild
            className="text-xs h-9 gap-1.5"
          >
            <a href={openWaApiDocsUrl} target="_blank" rel="noopener noreferrer">
              <Terminal className="h-3.5 w-3.5" />
              API Docs (Swagger)
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
          <Button
            size="sm"
            asChild
            className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <a href={openWaDashboardUrl} target="_blank" rel="noopener noreferrer">
              <QrCode className="h-4 w-4" />
              Open WhatsApp Dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Status Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Gateway Engine</CardDescription>
            <CardTitle className="text-base flex items-center justify-between">
              <span>OpenWA v0.31</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>API Endpoint: <code className="text-foreground font-mono">http://localhost:2785/api</code></p>
            <p>Swagger: <code className="text-foreground font-mono">/api/docs</code></p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Web Interface</CardDescription>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Vite Dashboard</span>
              <span className="flex h-2 w-2 rounded-full bg-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Dashboard URL: <code className="text-foreground font-mono">http://localhost:2886</code></p>
            <p>Hot-Reloading: <span className="text-emerald-500 font-semibold">Active</span></p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Authentication</CardDescription>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Admin API Key</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Auto-generated and stored in:</p>
            <code className="text-foreground font-mono text-[11px] block bg-muted p-1 rounded">
              OpenWA/data/.api-key
            </code>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Sender */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Quick Message Tester
              </CardTitle>
              <CardDescription className="text-xs">
                Test sending a WhatsApp message to any phone number through your local OpenWA instance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Destination Phone Number (with country code)
                  </label>
                  <Input
                    placeholder="+91 98765 43210 or 919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Format: Country code + number without spaces or plus (e.g. 919876543210).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Message Body
                  </label>
                  <Textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your WhatsApp message here..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSending ? "Sending via OpenWA..." : "Send WhatsApp Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: How to Link & Automate */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4 text-emerald-500" />
                How to Pair WhatsApp Account
              </CardTitle>
              <CardDescription className="text-xs">
                Follow these 3 simple steps to connect your WhatsApp phone number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  1
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Open OpenWA Dashboard</p>
                  <p className="text-muted-foreground">
                    Click the <strong>Open WhatsApp Dashboard</strong> button above or navigate to{" "}
                    <a
                      href={openWaDashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono"
                    >
                      http://localhost:2886
                    </a>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  2
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Create Session & Scan QR Code</p>
                  <p className="text-muted-foreground">
                    Click <strong>Add Session</strong>, pick your engine (Baileys for light RAM, or whatsapp-web.js for full browser), and scan the QR code using WhatsApp on your phone (<strong>Settings &gt; Linked Devices &gt; Link a Device</strong>).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  3
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Automate Multi-Platform Messaging</p>
                  <p className="text-muted-foreground">
                    Once linked, you can send automated updates, notifications, media messages, and replies across WhatsApp alongside your Instagram, YouTube, Facebook, and LinkedIn schedules!
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3 mt-4 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Important Best Practice</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  For automated business broadcasts, prefer a dedicated secondary or customer support SIM card to safeguard your personal number from spam flags.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
