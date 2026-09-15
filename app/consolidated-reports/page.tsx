import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ConsolidatedReportsContent } from "@/components/consolidated/consolidated-reports-content";
import { getCurrentUser } from "@/lib/auth";

export default async function StandaloneConsolidatedReportsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_member" && user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo" && (user.role as string) !== "finance_team")) {
    redirect("/login");
  }

  const enrolledDepartments = user.departments ? user.departments.map((d: any) => d.name) : [];
  const userPrimaryDept = enrolledDepartments.length > 0 ? enrolledDepartments[0] : undefined;

  return (
    <AppShell title="Consolidated Reports" role={user.role}>
      <ConsolidatedReportsContent
        userPrimaryDept={userPrimaryDept}
        enrolledDepartments={enrolledDepartments}
        enrolledTeams={user.teamNames || []}
        userRole={user.role}
      />
    </AppShell>
  );
}
