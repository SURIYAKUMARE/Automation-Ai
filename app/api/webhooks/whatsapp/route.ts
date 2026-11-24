import { NextRequest, NextResponse } from "next/server";
import { logTransmission } from "@/lib/whatsapp/cloud";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WHATSAPP_VERIFY_TOKEN || "socialsync_verify_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);

    // Extract statuses or messages if Meta webhook format
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses?.[0]) {
      const statusObj = value.statuses[0];
      logTransmission({
        id: statusObj.id || `wamid.STATUS_${Date.now()}`,
        recipient: `+${statusObj.recipient_id}`,
        messagePreview: `Status Update: ${statusObj.status}`,
        status: statusObj.status === "read" ? "read" : statusObj.status === "delivered" ? "delivered" : "sent",
        provider: "meta_cloud_api",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
