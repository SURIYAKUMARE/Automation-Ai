import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { signMedia } from "@/lib/publishing/media";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const page = Math.max(0, Math.min(10000, Number.parseInt(params.get("page") || "0") || 0));
  const size = 24;
  const search = params.get("q")?.trim().slice(0, 100);
  const collection = params.get("collection")?.trim().slice(0, 60);
  const type = params.get("type");
  try {
    const db = createAdminClient();
    let query = db.from("media_assets")
      .select("id,file_path,file_name,file_size,thumbnail_path,mime_type,collection_name,created_at,duration_seconds", { count: "exact" })
      .eq("user_id", user.id);
    if (search) query = query.ilike("file_name", "%" + search.replace(/[\\%_]/g, "\\$&") + "%");
    if (collection) query = query.eq("collection_name", collection);
    if (type === "video" || type === "image") query = query.like("mime_type", type + "/%");
    const { data, error, count } = await query.order("created_at", { ascending: false })
      .order("id").range(page * size, (page + 1) * size - 1);
    if (error) throw error;
    const media = await Promise.all(data.map(async ({ file_path, thumbnail_path, ...item }) => ({
      ...item,
      previewUrl: await signMedia(thumbnail_path || file_path, user.id).catch(() => null),
    })));
    return NextResponse.json({ media, total: count ?? 0, size });
  } catch {
    return NextResponse.json({ error: "Could not list uploads" }, { status: 503 });
  }
}
