import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportDateList } from "@/components/reports/report-date-list";
import { getCurrentUser } from "@/lib/auth";

export default async function HodReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "hod") {
    if (!user) redirect("/login");
    redirect("/reports");
  }

  return (
    <AppShell title="Department Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Reports Explorer"
          title="All Reports"
          description="Browse daily reports date by date and review department submissions."
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
