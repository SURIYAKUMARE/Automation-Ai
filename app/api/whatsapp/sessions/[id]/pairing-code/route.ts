import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { requestOpenWaPairingCode } from "@/lib/whatsapp/openwa";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";

  if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "Valid phone number with country code is required" }, { status: 400 });
  }

  try {
    const data = await requestOpenWaPairingCode(id, phoneNumber);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate pairing code" },
      { status: 400 }
    );
  }
}
