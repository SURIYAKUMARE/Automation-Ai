"use client";

import * as React from "react";
import {
  RefreshCw,
  ShieldCheck,
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
  status: "active" | "not_connected";
  scopes: string[];
  lastValidated?: string;
  expiresInDays?: number;
}

const DEFAULT_PLATFORMS: SocialPlatform[] = ["linkedin", "youtube", "instagram", "facebook"];

export default function ConnectedAccountsPage() {
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize with all accounts disconnected (ZERO fake data)
  const [accounts, setAccounts] = React.useState<AccountDisplay[]>([
    {
      id: "platform-li",
      platform: "linkedin",
      accountName: "",
      accountHandle: "",
      status: "not_connected",
      scopes: ["w_member_social", "openid", "profile", "email"],
    },
    {
      id: "platform-yt",
      platform: "youtube",
      accountName: "",
      accountHandle: "",
      status: "not_connected",
      scopes: ["youtube.upload", "youtube.readonly"],
    },
    {
      id: "platform-ig",
      platform: "instagram",
      accountName: "",
      accountHandle: "",
      status: "not_connected",
      scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    },
    {
      id: "platform-fb",
      platform: "facebook",
      accountName: "",
      accountHandle: "",
      status: "not_connected",
      scopes: ["pages_manage_posts", "pages_read_engagement"],
    },
  ]);

  // Load real connected accounts from backend database
  React.useEffect(() => {
    async function loadRealAccounts() {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          const realAccounts = data.accounts || [];

          if (realAccounts.length > 0) {
            setAccounts((prev) =>
              prev.map((acc) => {
                const found = realAccounts.find((r: any) => r.platform === acc.platform);
                if (found) {
                  return {
                    ...acc,
                    id: found.id || acc.id,
                    accountName: found.account_name || found.account_id || "Connected Account",
                    accountHandle: found.account_handle || `@${found.account_name || found.platform}`,
                    status: found.status === "active" ? "active" : "not_connected",
                    scopes: found.granted_scopes || acc.scopes,
                    lastValidated: found.last_validated_at ? new Date(found.last_validated_at).toLocaleDateString() : "Active",
                    expiresInDays: found.expires_in_days || 60,
                  };
                }
                return acc;
              })
            );
          }
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadRealAccounts();
  }, []);

  const handleConnect = (platform: SocialPlatform) => {
    toast.loading(`Redirecting to official ${platform.toUpperCase()} OAuth consent screen...`);
    window.location.href = `/api/oauth/${platform}?userId=00000000-0000-0000-0000-000000000001`;
  };

  const handleDisconnect = async (accountId: string, platform: SocialPlatform) => {
    if (!confirm(`Are you sure you want to disconnect your ${platform.toUpperCase()} account?`)) {
      return;
    }

    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, platform }),
      });

      if (!res.ok) throw new Error("Disconnection failed");

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.platform === platform
            ? { ...acc, status: "not_connected", accountName: "", accountHandle: "" }
            : acc
        )
      );
      toast.success(`${platform.toUpperCase()} account disconnected.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    }
  };

  const handleTestToken = async (platform: SocialPlatform) => {
    setIsSyncing(platform);
    try {
      const res = await fetch(`/api/${platform}/profile`);
      if (res.ok) {
        toast.success(`Validated ${platform.toUpperCase()} token. Connection operational.`);
      } else {
        toast.error(`Token check failed for ${platform.toUpperCase()}. Please re-authenticate.`);
      }
    } catch {
      toast.error(`Unable to verify ${platform.toUpperCase()} token.`);
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Authentication
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your official social media accounts via OAuth 2.0. No credentials stored.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border text-xs font-mono">
            OAuth 2.0 + PKCE
          </Badge>
        </div>
      </div>

      {/* Security notice alert */}
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-start gap-3 shadow-sm">
        <ShieldCheck className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Zero-Password Architecture</p>
          <p>
            Connect each platform manually below. SocialSync AI uses official OAuth 2.0 authorization flows. We never store or ask for your social media passwords.
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
                      Offline
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
                      {acc.expiresInDays && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Token Health:</span>
                          <span className="font-mono text-emerald-400">Valid ({acc.expiresInDays}d remaining)</span>
                        </div>
                      )}
                      {acc.lastValidated && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Last Validated:</span>
                          <span className="font-mono text-muted-foreground">{acc.lastValidated}</span>
                        </div>
                      )}
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
                      Connect your {acc.platform.toUpperCase()} account manually to enable multi-platform publishing and analytics.
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
                    size="sm"
                    onClick={() => handleConnect(acc.platform)}
                    className="w-full text-xs font-semibold gap-1.5 bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black shadow-sm"
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
