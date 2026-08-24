import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportDateList } from "@/components/reports/report-date-list";
import { getCurrentUser } from "@/lib/auth";

export default async function TopLevelReportsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Daily Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Reports Explorer"
          title="All Reports"
          description="Browse all daily reports date by date. Verify and review reports according to your role."
        />
        <ReportDateList
          endpoint="/api/report-manager/reports"
          title="reports"
          detailBaseHref="/reports"
          userRole={user.role}
          currentUserId={user.id}
        />
      </div>
    </AppShell>
  );
}
