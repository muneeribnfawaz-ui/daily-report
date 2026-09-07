import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportList } from "@/components/reports/report-list";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoReportsPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Reports Oversight" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Report Oversight"
          title="Reports"
          description="Browse all submitted reports with live search, status labels, and lock visibility."
        />
        <ReportList endpoint="/api/reports" title="reports" detailBaseHref="/ceo/reports" />
      </div>
    </AppShell>
  );
}
