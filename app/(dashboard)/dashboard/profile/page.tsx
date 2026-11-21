"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const emptyProfile = { full_name: "", email: "", organization: "", timezone: "UTC" };
const emptyBrand = { voice: "", audience: "", keywords: "" };

export default function SettingsPage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [brand, setBrand] = useState(emptyBrand);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(["/api/profile", "/api/brand-profile"].map(async (path) => {
      const response = await fetch(path, { signal: controller.signal });
      if (!response.ok) throw new Error();
      return response.json();
    })).then(([user, preferences]) => {
      const data = user.profile;
      setProfile({ ...data, full_name: data.full_name || "", organization: data.organization || "", timezone: data.timezone || "UTC" });
      setBrand(preferences.brand);
    }).catch(() => { if (!controller.signal.aborted) toast.error("Could not load settings."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function save(section: "profile" | "brand-profile") {
    setSaving(section);
    try {
      const response = await fetch("/api/" + section, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(section === "profile" ? profile : brand),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(section === "profile" ? "Profile saved" : "Brand voice saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving("");
    }
  }

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) router.replace("/login");
    else toast.error("Could not sign out.");
  }

  return <div className="space-y-6 max-w-4xl">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Button variant="outline" onClick={() => void logout()}>Sign out</Button>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Account profile</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save("profile"); }}>
          <label className="block text-sm">Full name<Input value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} required maxLength={100} /></label>
          <label className="block text-sm">Email<Input value={profile.email} readOnly /></label>
          <label className="block text-sm">Organization<Input value={profile.organization} onChange={(event) => setProfile({ ...profile, organization: event.target.value })} maxLength={200} /></label>
          <label className="block text-sm">Preferred timezone<Input value={profile.timezone} placeholder="Asia/Kolkata" onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} required /></label>
          <Button type="submit" disabled={loading || !!saving}>Save profile</Button>
        </form>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle className="text-base">Brand voice</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save("brand-profile"); }}>
          <p className="text-sm text-muted-foreground">Gemini will use these preferences when generating captions and content plans.</p>
          {([["voice", "Voice and writing style"], ["audience", "Audience"], ["keywords", "Preferred keywords"]] as const).map(([key, label]) =>
            <label key={key} className="block text-sm">{label}<Input value={brand[key]} maxLength={500} onChange={(event) => setBrand({ ...brand, [key]: event.target.value })} /></label>)}
          <Button type="submit" disabled={loading || !!saving}>Save brand voice</Button>
        </form>
      </CardContent>
    </Card>
  </div>;
}
