import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, message } = await req.json();
    if (!phoneNumber || !message) {
      return NextResponse.json({ error: "Phone number and message are required" }, { status: 400 });
    }

    const openWaUrl = process.env.OPENWA_API_URL || "http://localhost:2785";
    const formattedNumber = phoneNumber.replace(/[^0-9]/g, "");
    const receiver = formattedNumber.includes("@") ? formattedNumber : `${formattedNumber}@c.us`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${openWaUrl}/api/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver,
        message: { text: message },
      }),
      signal: controller.signal,
    }).catch((err) => {
      clearTimeout(timeout);
      throw err;
    });

    clearTimeout(timeout);

    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ success: true, data });
    }

    if (res && res.status === 404) {
      return NextResponse.json({
        success: false,
        error: "No active WhatsApp session found. Open the OpenWA Dashboard at http://localhost:2886 and scan the QR code first.",
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      delivered: false,
      notice: "Command received by OpenWA gateway. Ensure your WhatsApp session is linked in OpenWA Dashboard.",
    });
  } catch {
    const isVercel = Boolean(process.env.VERCEL);
    return NextResponse.json({
      success: false,
      error: isVercel
        ? "Your app is running in the Vercel cloud and cannot reach your computer's local port 2785 directly. To pair and send WhatsApp messages, open http://localhost:2886 on your local machine, or expose OpenWA via a tunnel (e.g. ngrok http 2785)."
        : "Cannot reach OpenWA on port 2785. Ensure OpenWA is running on your machine.",
    }, { status: 502 });
  }
}
