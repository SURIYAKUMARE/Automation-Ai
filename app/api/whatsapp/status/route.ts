import { NextResponse } from "next/server";
import { getOpenWaStatus } from "@/lib/whatsapp/openwa";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getOpenWaStatus();
  return NextResponse.json(status);
}
