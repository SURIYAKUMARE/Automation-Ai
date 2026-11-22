import { cookies } from "next/headers";
import Link from "next/link";
import { verifySessionToken } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const token = (await cookies()).get("socialsync_session")?.value;
  const user = token && verifySessionToken(token);
  const results: { label: string; href: string; kind: string; key: string }[] = [];
  let failed = false;
  if (user && query) {
    try {
      const db = createAdminClient();
      const pattern = "%" + query.replace(/[\\%_]/g, "\\$&") + "%";
      const [posts, media] = await Promise.all([
        db.from("posts").select("id,title,status").eq("user_id", user.id).ilike("title", pattern).order("created_at", { ascending: false }).limit(20),
        db.from("media_assets").select("id,file_name").eq("user_id", user.id).ilike("file_name", pattern).order("created_at", { ascending: false }).limit(20),
      ]);
      if (posts.error || media.error) throw new Error("Search unavailable");
      for (const post of posts.data) results.push({ key: post.id, label: post.title, kind: "Post",
        href: post.status === "draft" ? "/dashboard/create-post?draft=" + post.id : "/dashboard/history?post=" + post.id });
      for (const item of media.data) results.push({ key: item.id, label: item.file_name, kind: "Media", href: "/dashboard/create-post?media=" + item.id });
    } catch {
      failed = true;
    }
  }
  return <section className="space-y-5">
    <h1 className="text-2xl font-semibold">Search workspace</h1>
    <form action="/dashboard/search" className="flex gap-2">
      <input name="q" aria-label="Search by title or file name" defaultValue={query} required maxLength={100}
        className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2 text-sm" placeholder="Search posts and media" />
      <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Search</button>
    </form>
    {failed ? <p role="alert">Search is temporarily unavailable.</p> : query ? <>
      <p className="text-sm text-muted-foreground">{results.length ? "Results for “" + query + "”" : "No posts or media match “" + query + "”."}</p>
      <ul className="divide-y rounded-xl border bg-card">{results.map((item) => <li key={item.kind + item.key}>
        <Link href={item.href} className="flex justify-between gap-4 px-4 py-3 text-sm hover:bg-muted"><span className="min-w-0 truncate font-medium">{item.label}</span><span className="text-muted-foreground">{item.kind}</span></Link>
      </li>)}</ul>
    </> : <p className="text-sm text-muted-foreground">Search for a post title or file name.</p>}
  </section>;
}
