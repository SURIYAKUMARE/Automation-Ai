import PostHistory from "@/components/dashboard/post-history";

export default async function Page({ searchParams }: { searchParams: Promise<{ post?: string; status?: string }> }) {
  const { post, status } = await searchParams;
  const postId = typeof post === "string" ? post : undefined;
  const initialStatus = status === "failed" ? status : "all";
  return <PostHistory key={(postId ?? "") + initialStatus} postId={postId} status={initialStatus} />;
}
