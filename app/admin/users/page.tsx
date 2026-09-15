import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminUsersContent } from "@/components/admin/admin-users-content";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams?: Promise<{ role?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const isCeoView = resolvedParams.role === "ceo";

  return (
    <AppShell title={isCeoView ? "CEO Directory" : "User Management"} role={user.role}>
      <AdminUsersContent isCeoView={isCeoView} />
    </AppShell>
  );
}
