import PostHistory from "@/components/dashboard/post-history";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <PostHistory key={typeof q === "string" ? q : ""} view="draft" search={typeof q === "string" ? q : ""} />;
}
