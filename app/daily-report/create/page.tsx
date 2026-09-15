import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DailyReportForm } from "@/components/forms/daily-report-form";
import { HodDailyReportForm } from "@/components/forms/hod-daily-report-form";
import { ReportManagerDailyReportForm } from "@/components/forms/report-manager-daily-report-form";
import { getCurrentUser } from "@/lib/auth";

export default async function CreateDailyReportPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="Create Daily Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href="/daily-report/my-reports" title="Back" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Daily Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          {user.role === "hod" ? (
            <HodDailyReportForm />
          ) : user.role === "report_manager" ? (
            <ReportManagerDailyReportForm />
          ) : (
            <DailyReportForm />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
