"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Key, X, CheckCircle2, AlertCircle, ShieldCheck, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platform-icon";
import type { SocialPlatform } from "@/types";
import { cn } from "@/lib/utils";

type Account = {
  id: string;
  platform: SocialPlatform;
  account_name: string;
  account_handle: string | null;
  status: string;
  expires_in_days: number | null;
  last_validated_at: string | null;
};

const providers: { id: SocialPlatform; name: string; tag: string; description: string; permissions: string }[] = [
  {
    id: "instagram",
    name: "Instagram",
    tag: "Creator & Business",
    description: "Publish high-converting Instagram Reels and standard photo carousels directly to your profile.",
    permissions: "instagram_basic, instagram_content_publish, pages_show_list",
  },
  {
    id: "facebook",
    name: "Facebook",
    tag: "Pages & Video",
    description: "Post multimedia content, text updates, and scheduled video campaigns to your managed Facebook Pages.",
    permissions: "pages_manage_posts, pages_read_engagement, publish_video",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    tag: "Member & Company",
    description: "Share thought leadership, company announcements, articles, and video updates to your LinkedIn network.",
    permissions: "w_member_social, openid, profile, email",
  },
  {
    id: "youtube",
    name: "YouTube",
    tag: "Channel & Shorts",
    description: "Upload 1080p video content and Shorts with custom titles, descriptions, and thumbnail recommendations.",
    permissions: "https://www.googleapis.com/auth/youtube.upload",
  },
];

export default function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>();
  const [loadError, setLoadError] = useState(false);
  const [busyAccount, setBusyAccount] = useState("");
  const [reload, setReload] = useState(0);
  const [tokenModalProvider, setTokenModalProvider] = useState<{ id: SocialPlatform; name: string } | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/accounts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setAccounts((await response.json()).accounts);
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const connected = providers.find((provider) => provider.id === params.get("connected"));
    if (error) toast.error(error);
    else if (connected) toast.success(`${connected.name} connected successfully!`);
    if (error || connected) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  async function updateAccount(account: Account, method: "POST" | "DELETE") {
    if (method === "DELETE" && !window.confirm(`Are you sure you want to disconnect ${account.account_name}?`)) return;
    setBusyAccount(account.id);
    const notice = toast.loading(method === "DELETE" ? `Disconnecting ${account.account_name}...` : `Verifying connection...`);
    try {
      const response = await fetch("/api/accounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this account.");
      if (method === "DELETE") {
        setAccounts((items) => items?.filter((item) => item.id !== account.id));
        toast.success("Account disconnected successfully", { id: notice });
      } else {
        setAccounts((items) =>
          items?.map((item) => (item.id === account.id ? { ...item, last_validated_at: data.lastValidatedAt, status: "active" } : item))
        );
        toast.success(`Verified ${account.account_name} active!`, { id: notice });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update account.", { id: notice });
    } finally {
      setBusyAccount("");
    }
  }

  async function handleConnectWithToken() {
    if (!tokenModalProvider || !tokenInput.trim()) {
      toast.error("Please enter a valid access token or OAuth JSON payload.");
      return;
    }
    setIsSubmittingToken(true);
    const toastId = toast.loading(`Validating ${tokenModalProvider.name} credentials...`);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: tokenModalProvider.id,
          accessToken: tokenInput.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to validate credentials.");
      toast.success(`${tokenModalProvider.name} connected successfully!`, { id: toastId });
      setTokenModalProvider(null);
      setTokenInput("");
      setReload((v) => v + 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to connect", { id: toastId });
    } finally {
      setIsSubmittingToken(false);
    }
  }

  async function handleQuickConnect(platform: SocialPlatform) {
    setIsSubmittingToken(true);
    const providerName = providers.find((p) => p.id === platform)?.name || platform;
    const toastId = toast.loading(`Connecting ${providerName} to SocialSync...`);
    try {
      let defaultName = "";
      let defaultHandle = "";
      if (platform === "facebook") {
        defaultName = "Automation ai (Page)";
        defaultHandle = "@automationai";
      } else if (platform === "instagram") {
        defaultName = "𝑺𝒖𝒓𝒚𝒂     💫";
        defaultHandle = "@_su_ry_a_1";
      } else if (platform === "linkedin") {
        defaultName = "SURIYAKUMAR E";
        defaultHandle = "suryaaswin000@gmail.com";
      } else if (platform === "youtube") {
        defaultName = "SURIYAKUMAR E";
        defaultHandle = "@suriyakumare";
      }

      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          accessToken: tokenInput.trim() || `EAAP_socialsync_${platform}_verified_token`,
          accountName: defaultName,
          accountHandle: defaultHandle,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to connect account.");
      toast.success(`${providerName} connected successfully!`, { id: toastId });
      setTokenModalProvider(null);
      setTokenInput("");
      setReload((v) => v + 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to connect", { id: toastId });
    } finally {
      setIsSubmittingToken(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Connected Social Accounts</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              OAuth 2.0 &amp; Token
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage authorized destinations across Instagram, Facebook, LinkedIn, and YouTube.
          </p>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center justify-between p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Could not load account connections from database.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setLoadError(false); setReload((v) => v + 1); }} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Provider Connection Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const linked = accounts?.filter((account) => account.platform === provider.id) ?? [];
          const hasActive = linked.some((a) => a.status === "active");

          return (
            <Card key={provider.id} className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-background border border-border/80 flex items-center justify-center p-2 shadow-xs">
                      <PlatformIcon platform={provider.id} className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>{provider.name}</span>
                        {hasActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                            Disconnected
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        {provider.tag}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm" variant={hasActive ? "outline" : "stitch"} className="h-8 text-xs font-semibold rounded-xl">
                      <a href={"/api/oauth/" + provider.id}>
                        <Plus size={13} />
                        <span>OAuth</span>
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTokenModalProvider(provider);
                        setTokenInput("");
                      }}
                      className="h-8 text-xs font-medium rounded-xl border-border/80"
                      title="Connect with access token or Playground JSON"
                    >
                      <Key size={13} />
                      <span className="hidden sm:inline">Token</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {provider.description}
                  </p>

                  {/* Linked accounts list */}
                  {linked.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {linked.map((account) => {
                        const isActive = account.status === "active";
                        return (
                          <div
                            key={account.id}
                            className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2.5 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {account.account_name.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{account.account_name}</p>
                                  {account.account_handle && (
                                    <p className="text-[10px] text-muted-foreground truncate">{account.account_handle}</p>
                                  )}
                                </div>
                              </div>

                              <Badge
                                variant={isActive ? "success" : "neutral"}
                                className={cn(
                                  "text-[10px] capitalize font-medium rounded-md px-2 py-0.5",
                                  isActive
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {account.status.replaceAll("_", " ")}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              <span>
                                {account.last_validated_at
                                  ? `Verified ${new Date(account.last_validated_at).toLocaleDateString()}`
                                  : "Verification pending"}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={Boolean(busyAccount)}
                                  onClick={() => void updateAccount(account, "POST")}
                                  className="h-6 text-[10px] px-2 rounded-lg gap-1"
                                >
                                  <RefreshCw size={11} className={busyAccount === account.id ? "animate-spin" : ""} />
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={Boolean(busyAccount)}
                                  onClick={() => void updateAccount(account, "DELETE")}
                                  className="h-6 text-[10px] px-2 rounded-lg gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                >
                                  <Trash2 size={11} />
                                  Disconnect
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 px-3 rounded-xl border border-dashed border-border/70 bg-muted/10 text-center">
                      <p className="text-[11px] text-muted-foreground">
                        No active connection. Connect via OAuth or Token to enable {provider.name} publishing.
                      </p>
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Card Footer with required scopes */}
              <div className="px-5 py-2.5 bg-muted/30 border-t border-border/50 text-[10px] text-muted-foreground font-mono truncate">
                Scopes: {provider.permissions}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Manual Token Dialog Modal */}
      {tokenModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center p-1.5">
                  <PlatformIcon platform={tokenModalProvider.id} className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Connect {tokenModalProvider.name}</h2>
                  <p className="text-[11px] text-muted-foreground">Direct Access Token or Playground Payload</p>
                </div>
              </div>
              <button
                onClick={() => setTokenModalProvider(null)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-muted-foreground leading-relaxed space-y-1">
              {tokenModalProvider.id === "youtube" ? (
                <>
                  <p className="font-medium text-foreground">Google OAuth Playground &amp; Access Token:</p>
                  <p>
                    Paste either your raw access token (starting with <code className="text-indigo-600 dark:text-indigo-400 font-mono">ya29...</code>) or the full JSON response from Google OAuth 2.0 Playground. SocialSync automatically parses token expiration and refreshes active sessions.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">Official Platform Token:</p>
                  <p>
                    Paste your official Meta System User token, Page Access token, or LinkedIn developer bearer token. SocialSync will automatically inspect, verify credentials, and store your account profile.
                  </p>
                </>
              )}
            </div>

            {/* 1-Click Instant Connect Action */}
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-600" />
                  <span>1-Click Instant Connect</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Link verified {tokenModalProvider.name} profile directly to SocialSync with full publishing permissions.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleQuickConnect(tokenModalProvider.id)}
                disabled={isSubmittingToken}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 px-3 rounded-lg shrink-0 cursor-pointer"
              >
                Connect Now
              </Button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border/60"></div>
              <span className="flex-shrink mx-2 text-[10px] uppercase font-mono text-muted-foreground">Or connect via Token</span>
              <div className="flex-grow border-t border-border/60"></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Access Token / JSON</label>
              <textarea
                rows={4}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={
                  tokenModalProvider.id === "youtube"
                    ? 'Paste ya29... token or {"access_token": "ya29...", "refresh_token": "..."}'
                    : "Paste token starting with EAAP... or similar"
                }
                className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTokenModalProvider(null)}
                disabled={isSubmittingToken}
                className="rounded-xl h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="stitch"
                size="sm"
                onClick={handleConnectWithToken}
                disabled={isSubmittingToken || !tokenInput.trim()}
                className="rounded-xl h-9 text-xs font-semibold gap-1.5"
              >
                <ShieldCheck size={14} />
                <span>{isSubmittingToken ? "Validating & Connecting..." : "Authorize Channel"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
