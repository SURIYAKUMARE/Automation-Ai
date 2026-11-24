import { NextResponse } from "next/server";

export async function GET() {
  const openWaUrl = process.env.OPENWA_API_URL || "http://localhost:2785";
  const isVercel = Boolean(process.env.VERCEL);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${openWaUrl}/api/docs`, { signal: controller.signal });
    clearTimeout(timeout);

    return NextResponse.json({
      online: res.ok || res.status < 500,
      url: openWaUrl,
      mode: isVercel ? "cloud" : "local",
    });
  } catch {
    return NextResponse.json({
      online: false,
      url: openWaUrl,
      mode: isVercel ? "cloud" : "local",
      message: isVercel
        ? "Vercel cloud deployment cannot access localhost:2785 without a public tunnel. Use http://localhost:2886 on your local machine to manage WhatsApp."
        : "OpenWA is offline on port 2785. Run OpenWA locally to pair WhatsApp and send messages.",
    });
  }
}
