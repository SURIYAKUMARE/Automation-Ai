import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { controlOpenWaSession } from "@/lib/whatsapp/openwa";

export const dynamic = "force-dynamic";

const ActionSchema = z.object({
  action: z.enum(["start", "stop", "logout", "delete"]),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await context.params;
  const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action. Must be start, stop, logout, or delete." }, { status: 400 });
  }

  try {
    const result = await controlOpenWaSession(id, parsed.data.action);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session action failed" },
      { status: 500 }
    );
  }
}
