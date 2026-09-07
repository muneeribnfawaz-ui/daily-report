import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ConsolidatedReportPreviewScreen } from "@/components/consolidated/consolidated-report-preview-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function StandaloneConsolidatedReportDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ date: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_member" && user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo" && (user.role as string) !== "finance_team")) {
    redirect("/login");
  }

  const { date } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const period = typeof resolvedSearchParams.period === "string" ? resolvedSearchParams.period : "daily";

  return (
    <AppShell title="Consolidated Report Preview" role={user.role}>
      <div className="space-y-6">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading preview configuration...</div>}>
          <ConsolidatedReportPreviewScreen
            endpoint="/api/consolidated-reports"
            date={date}
            period={period}
            backHref="/consolidated-reports"
            title="Consolidated Report Preview"
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
