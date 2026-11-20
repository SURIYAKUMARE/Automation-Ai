"use client";

import * as React from "react";
import { User, Mail, Building, Globe, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ProfilePage() {
  const [fullName, setFullName] = React.useState("Jeffrey Rathinam");
  const [email, setEmail] = React.useState("jeffrey@rathinam.in");
  const [organization, setOrganization] = React.useState("Rathinam Group of Institutions");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata (UTC+5:30)");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Profile updated successfully!");
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          User Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal account details, timezone preferences, and organization settings.
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Account Information</CardTitle>
          <CardDescription>Update your contact and team details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Full Name
              </label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email Address
              </label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled className="text-xs opacity-70" />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-primary" /> Organization / College
              </label>
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> Preferred Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-input bg-card p-2 text-foreground text-xs"
              >
                <option value="Asia/Kolkata (UTC+5:30)">Asia/Kolkata (UTC+5:30)</option>
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York (EST)">America/New_York (EST)</option>
                <option value="Europe/London (GMT)">Europe/London (GMT)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="stitch" size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Profile"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
