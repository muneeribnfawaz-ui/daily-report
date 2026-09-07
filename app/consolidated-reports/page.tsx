import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ConsolidatedReportBrowser } from "@/components/consolidated/consolidated-report-browser";
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
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Consolidated View"
          title="Consolidated Reports"
          description="Browse consolidated daily report summaries tailored to your enrolled department and role."
        />
        <ConsolidatedReportBrowser
          endpoint="/api/consolidated-reports"
          detailBaseHref="/consolidated-reports"
          userDepartment={userPrimaryDept}
          enrolledDepartments={enrolledDepartments}
          enrolledTeams={user.teamNames || []}
          userRole={user.role}
        />
      </div>
    </AppShell>
  );
}
