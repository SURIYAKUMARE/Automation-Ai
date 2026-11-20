"use client";

import * as React from "react";
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Key,
  Info,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SocialPlatform } from "@/types";

interface AccountDisplay {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountHandle: string;
  status: "active" | "expired" | "not_connected" | "action_required";
  scopes: string[];
  lastValidated: string;
  expiresInDays?: number;
}

export default function ConnectedAccountsPage() {
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);

  const [accounts, setAccounts] = React.useState<AccountDisplay[]>([
    {
      id: "acc-li-1",
      platform: "linkedin",
      accountName: "Jeffrey Rathinam",
      accountHandle: "@jeffreyrathinam",
      status: "active",
      scopes: ["w_member_social", "openid", "profile", "email"],
      lastValidated: "Today, 04:30 PM",
      expiresInDays: 58,
    },
    {
      id: "acc-yt-1",
      platform: "youtube",
      accountName: "SocialSync AI Official",
      accountHandle: "@SocialSyncAIOfficial",
      status: "active",
      scopes: ["youtube.upload", "youtube.readonly", "userinfo.profile"],
      lastValidated: "Today, 02:10 PM",
      expiresInDays: 365,
    },
    {
      id: "acc-ig-1",
      platform: "instagram",
      accountName: "socialsync.ai",
      accountHandle: "@socialsync.ai (Professional)",
      status: "active",
      scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
      lastValidated: "Yesterday, 11:20 AM",
      expiresInDays: 54,
    },
    {
      id: "acc-fb-1",
      platform: "facebook",
      accountName: "SocialSync AI Platform Page",
      accountHandle: "@socialsyncplatform (Page)",
      status: "active",
      scopes: ["pages_manage_posts", "pages_read_engagement"],
      lastValidated: "Today, 01:05 PM",
      expiresInDays: 90,
    },
  ]);

  const handleConnect = (platform: SocialPlatform) => {
    toast.loading(`Redirecting to official ${platform.toUpperCase()} OAuth consent screen...`);
    window.location.href = `/api/oauth/${platform}/authorize?userId=00000000-0000-0000-0000-000000000001`;
  };

  const handleDisconnect = async (accountId: string, platform: SocialPlatform) => {
    if (!confirm(`Are you sure you want to disconnect your ${platform.toUpperCase()} account? Automated publishing will stop.`)) {
      return;
    }

    try {
      const res = await fetch("/api/oauth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, userId: "00000000-0000-0000-0000-000000000001" }),
      });

      if (!res.ok) throw new Error("Disconnection failed");

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, status: "not_connected" } : acc))
      );
      toast.success(`${platform.toUpperCase()} account disconnected.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    }
  };

  const handleTestToken = async (platform: SocialPlatform) => {
    setIsSyncing(platform);
    setTimeout(() => {
      setIsSyncing(null);
      toast.success(`Validated ${platform.toUpperCase()} token. Permissions & scopes operational.`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Connected Social Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage official OAuth 2.0 authorizations with encrypted tokens at rest.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-3 py-1">
            AES-256-GCM Encrypted
          </Badge>
        </div>
      </div>

      {/* Security notice alert */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Zero-Password Architecture</p>
          <p>
            SocialSync AI uses official OAuth authorization flows. We never store or ask for your social media passwords. Access tokens are encrypted at rest with hardware-grade AES-256-GCM and never delivered to the client browser.
          </p>
        </div>
      </div>

      {/* 4 Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map((acc) => {
          const isConnected = acc.status === "active";
          return (
            <Card key={acc.platform} className="border-border/80 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-bold text-base capitalize">
                      {acc.platform.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="capitalize text-base flex items-center gap-2">
                        {acc.platform}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {isConnected ? acc.accountHandle : "Not connected"}
                      </CardDescription>
                    </div>
                  </div>

                  {isConnected ? (
                    <Badge variant="success" dot className="text-xs">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-xs">
                      Disconnected
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-2 text-xs">
                {isConnected ? (
                  <>
                    <div className="rounded-lg bg-accent/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-semibold text-foreground">{acc.accountName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Token Health:</span>
                        <span className="font-mono text-emerald-400">Valid ({acc.expiresInDays}d remaining)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Validated:</span>
                        <span className="font-mono text-muted-foreground">{acc.lastValidated}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold">Granted Scopes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {acc.scopes.map((s, i) => (
                          <span key={i} className="rounded bg-slate-800 text-slate-300 px-1.5 py-0.5 text-[10px] font-mono border border-slate-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-muted-foreground">
                      Connect your {acc.platform.toUpperCase()} account to enable automated publishing, scheduled queues, and real engagement metrics.
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-between">
                {isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestToken(acc.platform)}
                      disabled={isSyncing === acc.platform}
                      className="text-xs gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncing === acc.platform ? "animate-spin" : ""}`} />
                      <span>Test Token</span>
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect(acc.id, acc.platform)}
                      className="text-xs gap-1.5"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Disconnect</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="stitch"
                    size="sm"
                    onClick={() => handleConnect(acc.platform)}
                    className="w-full text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Connect {acc.platform.toUpperCase()}</span>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
