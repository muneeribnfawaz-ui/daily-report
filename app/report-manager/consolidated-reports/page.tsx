import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ConsolidatedReportBrowser } from "@/components/consolidated/consolidated-report-browser";
import { getCurrentUser } from "@/lib/auth";

export default async function ConsolidatedReportsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Consolidated Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Consolidated View"
          title="Consolidated Reports"
          description="Browse consolidated report dates here, then open a separate preview screen for the full report and PDF download."
        />
        <ConsolidatedReportBrowser endpoint="/api/consolidated-reports" detailBaseHref="/report-manager/consolidated-reports" />
      </div>
    </AppShell>
  );
}
