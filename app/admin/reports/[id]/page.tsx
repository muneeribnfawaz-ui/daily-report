import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportDetailExplorer } from "@/components/reports/report-detail-explorer";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/admin/reports");
  }

  const { id } = await params;

  return (
    <AppShell title="Report Details" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Report Oversight"
          title="Report Details"
          description="Open any report to inspect the full content, team-level context, and consolidated results for a selected date."
        />
        <ReportDetailExplorer reportId={id} />
      </div>
    </AppShell>
  );
}
