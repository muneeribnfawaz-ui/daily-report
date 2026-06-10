import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { TeamTypesManager } from "@/components/admin/team-types-manager";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminTeamTypesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <AppShell title="Team Types" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Directory Settings"
          title="Team Types"
          description="Create and manage the team types used across users and reports."
        />
        <TeamTypesManager />
      </div>
    </AppShell>
  );
}
