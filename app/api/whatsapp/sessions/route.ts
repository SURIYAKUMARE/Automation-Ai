import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createOpenWaSession, getOpenWaStatus } from "@/lib/whatsapp/openwa";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getOpenWaStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : `whatsapp-${Date.now().toString().slice(-4)}`;

  try {
    const session = await createOpenWaSession(name);
    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create WhatsApp session" },
      { status: 500 }
    );
  }
}
