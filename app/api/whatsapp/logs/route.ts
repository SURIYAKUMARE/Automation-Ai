import { NextResponse } from "next/server";
import { getTransmissionLogs } from "@/lib/whatsapp/openwa";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = getTransmissionLogs();
  return NextResponse.json({ logs });
}
