import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getOpenWaConfig, getOpenWaStatus, saveOpenWaConfig } from "@/lib/whatsapp/openwa";

export const dynamic = "force-dynamic";

const ConfigSchema = z.object({
  apiUrl: z.string().trim().url().refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://"),
  dashboardUrl: z.string().trim().optional(),
  apiKey: z.string().trim().optional(),
});

export async function GET() {
  const config = await getOpenWaConfig();
  return NextResponse.json({
    apiUrl: config.apiUrl,
    dashboardUrl: config.dashboardUrl,
    hasApiKey: Boolean(config.apiKey),
    updatedAt: config.updatedAt || null,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = ConfigSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues.map((i) => i.message).join(", ") || "Invalid gateway URL" },
      { status: 400 }
    );
  }

  try {
    const saved = await saveOpenWaConfig(body.data);
    const status = await getOpenWaStatus();
    return NextResponse.json({ success: true, config: { apiUrl: saved.apiUrl, dashboardUrl: saved.dashboardUrl, updatedAt: saved.updatedAt }, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save OpenWA configuration" },
      { status: 500 }
    );
  }
}
