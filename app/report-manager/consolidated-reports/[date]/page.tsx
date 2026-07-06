import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ConsolidatedReportPreviewScreen } from "@/components/consolidated/consolidated-report-preview-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function ConsolidatedReportDetailPage({
  params
}: {
  params: Promise<{ date: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  const { date } = await params;

  return (
    <AppShell title="Consolidated Report Preview" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Report Preview"
          title="Consolidated Report Preview"
          description="This screen shows the full consolidated report preview for a selected date, with a PDF download option."
        />
        <ConsolidatedReportPreviewScreen
          endpoint="/api/consolidated-reports"
          date={date}
          backHref="/report-manager/consolidated-reports"
          title="Consolidated Report Preview"
        />
      </div>
    </AppShell>
  );
}
