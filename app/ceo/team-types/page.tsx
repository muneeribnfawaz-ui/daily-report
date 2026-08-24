import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TeamTypesManager } from "@/components/admin/team-types-manager";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoTeamTypesPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Team Types" role={user.role}>
      <TeamTypesManager />
    </AppShell>
  );
}
