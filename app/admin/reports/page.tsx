import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportList } from "@/components/reports/report-list";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <AppShell title="Admin Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Report Oversight"
          title="Reports"
          description="Browse all submitted reports with live search, status labels, and lock visibility."
        />
        <ReportList endpoint="/api/reports" title="reports" detailBaseHref="/admin/reports" />
      </div>
    </AppShell>
  );
}
