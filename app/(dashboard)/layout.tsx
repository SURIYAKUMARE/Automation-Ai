import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth/session";

import * as React from "react";
import { TopNav } from "@/components/dashboard/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get('socialsync_session')?.value;
  if (!token || !verifySessionToken(token)) redirect('/login');
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav />
      <main className="flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {children}
        </div>
      </main>
      <footer className="w-full border-t border-border py-4 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 font-mono">
          <span>SocialFlow AI &bull; Cross-Platform Distribution Engine</span>
          <span>OAuth 2.0 &bull; Gemini Multimodal AI &bull; Supabase</span>
        </div>
      </footer>
    </div>
  );
}
