import { NextResponse } from "next/server";
import { getTransmissionLogs } from "@/lib/whatsapp/cloud";

export async function GET() {
  const logs = getTransmissionLogs();
  return NextResponse.json({ logs });
}
