import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminTeamTypesContent } from "@/components/admin/admin-team-types-content";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminTeamTypesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Team Types" role={user.role}>
      <AdminTeamTypesContent />
    </AppShell>
  );
}
