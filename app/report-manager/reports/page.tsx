import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportDateList } from "@/components/reports/report-date-list";
import { getCurrentUser } from "@/lib/auth";

export default async function ReportManagerReportsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Team Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Manager Review"
          title="All Reports"
          description="Browse all users' reports date by date with pagination. Each page loads all reports for the visible date, and you can open any report from the list."
        />
        <ReportDateList endpoint="/api/report-manager/reports" title="reports" detailBaseHref="/report-manager/reports" />
      </div>
    </AppShell>
  );
}
