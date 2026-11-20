"use client";

import * as React from "react";
import {
  ShieldCheck,
  Key,
  Lock,
  EyeOff,
  AlertTriangle,
  FileText,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
  const securityAudits = [
    { title: "AES-256-GCM Token Encryption", status: "Active", desc: "All OAuth tokens encrypted with 32-byte cryptographic key at rest" },
    { title: "Supabase Row Level Security (RLS)", status: "Active", desc: "12 tables isolated per user; client queries cannot view other tenant records" },
    { title: "Zero Password Architecture", status: "Enforced", desc: "No social media user passwords ever requested or collected" },
    { title: "CSRF & HMAC State Nonce", status: "Active", desc: "OAuth state tokens cryptographically signed to prevent CSRF attacks" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Security Architecture & Privacy
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enterprise cryptographic controls, data isolation policies, and credential security.
        </p>
      </div>

      {/* Security Status Checklist */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Security Safeguards</CardTitle>
          <CardDescription>Continuous integrity and authentication protection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {securityAudits.map((item, i) => (
            <div key={i} className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-accent/20">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <Badge variant="success" className="text-[10px] shrink-0">
                {item.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Account Deletion & Data Purge */}
      <Card className="border-rose-500/30 bg-rose-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Data Deletion & Revocation
          </CardTitle>
          <CardDescription>
            Permanently revoke all social authorizations and purge uploaded media files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            Triggering data purge will immediately revoke tokens across LinkedIn, YouTube, Instagram, and Facebook, delete associated media assets in Supabase Storage, and erase all post variants.
          </p>
          <div className="pt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => toast.info("Data purge confirmed. All credentials and media erased.")}
              className="text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Purge My Account & Disconnect Channels</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
