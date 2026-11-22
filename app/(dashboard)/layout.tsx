import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth/session";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("socialsync_session")?.value;
  const user = token ? verifySessionToken(token) : null;
  if (!user) redirect("/login");
  return <WorkspaceShell user={{ name: user.name, email: user.email }}>{children}</WorkspaceShell>;
}
