"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Key, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platform-icon";
import type { SocialPlatform } from "@/types";

type Account = {
  id: string;
  platform: SocialPlatform;
  account_name: string;
  account_handle: string | null;
  status: string;
  expires_in_days: number | null;
  last_validated_at: string | null;
};

const providers: { id: SocialPlatform; name: string; eligibility: string }[] = [
  { id: "linkedin", name: "LinkedIn", eligibility: "Connect your LinkedIn member profile and allow SocialFlow to publish on your behalf." },
  { id: "youtube", name: "YouTube", eligibility: "Choose the Google account and YouTube channel you want to upload to." },
  { id: "instagram", name: "Instagram", eligibility: "Connect a Business or Creator account linked to a Facebook Page you can publish to." },
  { id: "facebook", name: "Facebook", eligibility: "Use a Facebook account that has permission to create posts on your Page." },
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
    fetch("/api/accounts", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      setAccounts((await response.json()).accounts);
      setLoadError(false);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const connected = providers.find((provider) => provider.id === params.get("connected"));
    if (error) toast.error(error);
    else if (connected) toast.success(connected.name + " connected");
    if (error || connected) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  async function updateAccount(account: Account, method: "POST" | "DELETE") {
    if (method === "DELETE" && !window.confirm("Disconnect " + account.account_name + "?")) return;
    setBusyAccount(account.id);
    try {
      const response = await fetch("/api/accounts", {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this account.");
      if (method === "DELETE") {
        setAccounts((items) => items?.filter((item) => item.id !== account.id));
        toast.success("Account disconnected");
      } else {
        setAccounts((items) => items?.map((item) => item.id === account.id ? { ...item, last_validated_at: data.lastValidatedAt } : item));
        toast.success("Verified " + account.account_name);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this account.");
    } finally {
      setBusyAccount("");
    }
  }

  async function handleConnectWithToken() {
    if (!tokenModalProvider || !tokenInput.trim()) {
      toast.error("Please enter a valid access token.");
      return;
    }
    setIsSubmittingToken(true);
    const toastId = toast.loading(`Connecting ${tokenModalProvider.name}...`);
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
      if (!response.ok) throw new Error(data.error || "Failed to connect token.");
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

  return <section className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Social accounts</h1>
      <p className="mt-1 text-sm text-muted-foreground">Connect your own accounts to this SocialFlow workspace using official OAuth or your direct access token.</p>
    </div>
    {loadError && <div role="alert" className="flex items-center gap-3 text-sm">
      <span>Could not load your connections.</span>
      <Button size="sm" variant="outline" onClick={() => { setLoadError(false); setReload((value) => value + 1); }}>Retry</Button>
    </div>}
    {!accounts && !loadError && <p role="status" className="text-sm text-muted-foreground">Loading connections…</p>}
    <div className="grid gap-4 md:grid-cols-2">
      {providers.map((provider) => {
        const linked = accounts?.filter((account) => account.platform === provider.id) ?? [];
        return <Card key={provider.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PlatformIcon platform={provider.id} className="size-6" />{provider.name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button asChild size="sm" variant={linked.length ? "outline" : "stitch"}>
                <a href={"/api/oauth/" + provider.id}><Plus size={14} />{linked.length ? "OAuth" : "Connect " + provider.name}</a>
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTokenModalProvider(provider); setTokenInput(""); }}>
                <Key size={14} /> Token
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{provider.eligibility}</p>
            {linked.map((account) => <div key={account.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 break-words">
                  <p className="text-sm font-medium">{account.account_name}</p>
                  {account.account_handle && <p className="text-xs text-muted-foreground">{account.account_handle}</p>}
                </div>
                <Badge variant={account.status === "active" ? "success" : "neutral"} className="capitalize">
                  {account.status.replaceAll("_", " ")}
                </Badge>
              </div>
              {account.last_validated_at && <p className="text-xs text-muted-foreground">Last checked {new Date(account.last_validated_at).toLocaleDateString()}</p>}
              <div className="flex flex-wrap gap-2">
                {account.status === "active" && <Button size="sm" variant="outline" disabled={Boolean(busyAccount)} onClick={() => void updateAccount(account, "POST")}>
                  <RefreshCw size={14} /> Verify
                </Button>}
                <Button size="sm" variant="outline" disabled={Boolean(busyAccount)} onClick={() => void updateAccount(account, "DELETE")}>
                  <Trash2 size={14} /> Disconnect
                </Button>
              </div>
            </div>)}
          </CardContent>
        </Card>;
      })}
    </div>

    {tokenModalProvider && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={tokenModalProvider.id} className="size-6" />
              <h2 className="text-base font-semibold">Connect {tokenModalProvider.name}</h2>
            </div>
            <button
              onClick={() => setTokenModalProvider(null)}
              className="text-muted-foreground hover:text-foreground rounded-lg p-1"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {tokenModalProvider.id === "youtube"
              ? "For YouTube: Paste your Google access token (starts with ya29...) or the JSON response from Google OAuth 2.0 Playground. Note: Google access tokens expire after 1 hour unless refreshed."
              : "Paste your official access token (such as a Meta System User token, Page Access token, or developer token). We will automatically retrieve and link your account."}
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Access Token</label>
            <textarea
              rows={4}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={tokenModalProvider.id === "youtube" ? "Paste Google access token (ya29...) or Playground JSON" : "Paste token starting with EAAP... or similar"}
              className="w-full rounded-lg border border-input bg-transparent p-2.5 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTokenModalProvider(null)}
              disabled={isSubmittingToken}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="stitch"
              size="sm"
              onClick={handleConnectWithToken}
              disabled={isSubmittingToken || !tokenInput.trim()}
              className="text-xs font-semibold"
            >
              {isSubmittingToken ? "Connecting..." : "Validate & Connect"}
            </Button>
          </div>
        </div>
      </div>
    )}
  </section>;
}
