import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppCloudMessage } from "@/lib/whatsapp/cloud";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.phoneNumber || !body.message) {
      return NextResponse.json({ error: "Phone number and message body are required." }, { status: 400 });
    }

    const { phoneNumber, message, metaConfig } = body;

    const result = await sendWhatsAppCloudMessage({
      phoneNumber,
      message,
      metaConfig,
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Could not send WhatsApp message";
    return NextResponse.json({
      success: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
