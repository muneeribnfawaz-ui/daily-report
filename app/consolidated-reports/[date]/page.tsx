import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ConsolidatedReportPreviewScreen } from "@/components/consolidated/consolidated-report-preview-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function StandaloneConsolidatedReportDetailPage({
  params
}: {
  params: Promise<{ date: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo" && user.role !== "finance_team")) {
    redirect("/login");
  }

  const { date } = await params;

  return (
    <AppShell title="Consolidated Report Preview" role={user.role}>
      <div className="space-y-6">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading preview configuration...</div>}>
          <ConsolidatedReportPreviewScreen
            endpoint="/api/consolidated-reports"
            date={date}
            backHref="/consolidated-reports"
            title="Consolidated Report Preview"
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
