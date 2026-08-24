import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportDetailExplorer } from "@/components/reports/report-detail-explorer";
import { getCurrentUser } from "@/lib/auth";

export default async function TopLevelReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/reports");
  }

  const { id } = await params;

  return (
    <AppShell title="Report Details" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Report Insight"
          title="Report Details"
          description="Review one report in detail, then inspect team-specific and consolidated reports for any date."
        />
        <ReportDetailExplorer reportId={id} />
      </div>
    </AppShell>
  );
}
