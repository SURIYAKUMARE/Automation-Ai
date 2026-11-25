import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getOpenWaSessionQR } from "@/lib/whatsapp/openwa";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await context.params;
  try {
    const data = await getOpenWaSessionQR(id);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "QR code not ready yet" },
      { status: 400 }
    );
  }
}
