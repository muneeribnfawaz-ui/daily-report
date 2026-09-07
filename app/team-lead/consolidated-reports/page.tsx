import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ConsolidatedReportBrowser } from "@/components/consolidated/consolidated-report-browser";
import { getCurrentUser } from "@/lib/auth";
import { isInFinance } from "@/lib/permissions";

export default async function TeamLeadConsolidatedReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "team_lead" || isInFinance(user)) {
    if (!user) redirect("/login");
    redirect(isInFinance(user) ? "/finance" : "/consolidated-reports");
  }

  const enrolledDepartments = user.departments ? user.departments.map((d) => d.name) : [];
  const userPrimaryDept = enrolledDepartments.length > 0 ? enrolledDepartments[0] : undefined;

  return (
    <AppShell title="Consolidated Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Consolidated View"
          title="Consolidated Reports"
          description="Browse consolidated daily report summaries tailored to your team and department."
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
