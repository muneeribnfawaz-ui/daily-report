import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportDetailExplorer } from "@/components/reports/report-detail-explorer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function TopLevelReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <AppShell title="Report Details" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Report Insight"
          title="Report Details"
          description="Review one report in detail, then inspect team-specific and consolidated reports for any date."
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/reports" title="Back" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <ReportDetailExplorer reportId={id} />
      </div>
    </AppShell>
  );
}
