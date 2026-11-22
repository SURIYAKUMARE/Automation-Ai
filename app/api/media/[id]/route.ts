import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { signMedia } from "@/lib/publishing/media";
import { postIdSchema } from "@/lib/publishing/campaign";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = postIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  try {
    const { data, error } = await createAdminClient().from("media_assets")
      .select("id,file_name,file_path,mime_type").eq("id", id.data).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Media unavailable" }, { status: 404 });
    const { file_path, ...media } = data;
    return NextResponse.json({ media, previewUrl: await signMedia(file_path, user.id) });
  } catch {
    return NextResponse.json({ error: "Could not open uploaded media" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = postIdSchema.safeParse((await params).id);
  const body = z.object({ collection: z.string().trim().max(60) }).safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Enter a collection of up to 60 characters" }, { status: 400 });
  try {
    const { data, error } = await createAdminClient().from("media_assets")
      .update({ collection_name: body.data.collection || null }).eq("id", id.data)
      .eq("user_id", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Media unavailable" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not update the collection" }, { status: 503 });
  }
}
