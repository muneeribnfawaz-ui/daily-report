import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EditTeamTypeScreen } from "@/components/admin/edit-team-type-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoEditTeamTypePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);

  return (
    <AppShell title="Edit Team Type" role={user.role}>
      <EditTeamTypeScreen teamTypeId={id} backHref="/ceo/team-types" successHref="/ceo/team-types" />
    </AppShell>
  );
}
