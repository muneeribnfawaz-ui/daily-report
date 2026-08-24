import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CreateTeamTypeScreen } from "@/components/admin/create-team-type-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoCreateTeamTypePage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Create Team Type" role={user.role}>
      <CreateTeamTypeScreen backHref="/ceo/team-types" successHref="/ceo/team-types" />
    </AppShell>
  );
}
