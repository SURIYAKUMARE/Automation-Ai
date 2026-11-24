import { NextResponse } from "next/server";

export async function GET() {
  const hasMeta = Boolean(process.env.META_WHATSAPP_PHONE_ID && process.env.META_WHATSAPP_TOKEN);

  return NextResponse.json({
    online: true,
    engine: "SocialSync WhatsApp Cloud Gateway",
    version: "v2.4-cloud",
    mode: "cloud_native",
    metaConfigured: hasMeta,
    activeSession: true,
    capabilities: [
      "Zero Local Server Required",
      "Cloud-Native Dispatch",
      "Meta WhatsApp Cloud API Protocol",
      "Live Campaign Webhooks",
      "Sub-second Message Transmission",
    ],
  });
}
