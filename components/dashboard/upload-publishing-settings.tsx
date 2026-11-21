"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Account = { id: string; platform: string; account_name: string };
type Settings = { enabled: boolean; account_ids: string[]; language: string; youtube_privacy: string };

export function UploadPublishingSettings({ onEnabledChange, busy }: { onEnabledChange: (enabled: boolean) => void; busy: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [selected, setSelected] = useState<string[]>([]);
  const [language, setLanguage] = useState("English");
  const [privacy, setPrivacy] = useState("private");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/automation/upload-settings", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      const saved = data.settings ?? { enabled: false, account_ids: [], language: "English", youtube_privacy: "private" };
      setAccounts(data.accounts);
      setSettings(saved);
      setSelected(saved.account_ids);
      setLanguage(saved.language);
      setPrivacy(saved.youtube_privacy);
      onEnabledChange(saved.enabled);
    }).catch(() => { if (!controller.signal.aborted) setError("Could not load automatic publishing settings."); });
    return () => controller.abort();
  }, [onEnabledChange]);

  async function save(enabled: boolean) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/automation/upload-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, acknowledged, accountIds: selected, language, youtubePrivacy: privacy }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings(data.settings);
      setAcknowledged(false);
      onEnabledChange(data.settings.enabled);
      toast.success(enabled ? "Automatic upload publishing enabled" : "Automatic upload publishing disabled");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the settings.");
    } finally {
      setSaving(false);
    }
  }

  const savedDestinations = settings?.account_ids.map((id) => accounts.find((account) => account.id === id)?.account_name || "Disconnected account") || [];
  return <details className="rounded-xl border bg-card p-4">
    <summary className="cursor-pointer text-sm font-semibold">Publish automatically on upload{settings?.enabled ? " · On" : ""}</summary>
    <p className="mt-2 text-sm text-muted-foreground">Once enabled here, choosing a file uploads it, generates captions, and queues it for the saved destinations without another confirmation.</p>
    {settings?.enabled && <p className="mt-2 text-sm">Active destinations · {savedDestinations.join(", ")}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    {settings && <fieldset disabled={saving || busy} className="mt-3 space-y-3">
      {accounts.length ? <div className="grid gap-2 sm:grid-cols-2">{accounts.map((account) => (
        <label className="flex items-center gap-2 text-sm" key={account.id}>
          <input type="checkbox" checked={selected.includes(account.id)} onChange={(event) => setSelected((ids) =>
            event.target.checked ? [...ids, account.id] : ids.filter((id) => id !== account.id))} />
          <span>{account.account_name} · <span className="capitalize">{account.platform}</span></span>
        </label>
      ))}</div> : <p className="text-sm text-muted-foreground">Connect a social account before enabling this.</p>}
      <label className="block text-sm">Caption language
        <select className="ml-2 rounded border bg-background p-1" value={language} onChange={(event) => setLanguage(event.target.value)}>
          {["English", "Tamil", "Tanglish"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      {accounts.some((account) => account.platform === "youtube" && selected.includes(account.id)) &&
        <label className="block text-sm">YouTube visibility
          <select className="ml-2 rounded border bg-background p-1" value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
            <option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option>
          </select>
        </label>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
        I authorize publishing future uploads to the selected accounts.
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="button" disabled={!acknowledged || !selected.length} onClick={() => void save(true)}>
          {settings.enabled ? "Save authorization" : "Enable upload publishing"}
        </Button>
        {settings.enabled && <Button type="button" size="sm" variant="outline" onClick={() => void save(false)}>Disable upload publishing</Button>}
      </div>
    </fieldset>}
  </details>;
}
