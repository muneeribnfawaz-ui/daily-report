import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HodDailyReportForm } from "@/components/forms/hod-daily-report-form";
import { getCurrentUser } from "@/lib/auth";

export default async function EditHodDailyReportPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "hod") {
    redirect("/login");
  }

  const { date } = searchParams;
  if (!date) {
    redirect("/daily-report/my-reports");
  }

  return (
    <AppShell title="Edit HOD Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href="/reports" title="Back" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Edit Daily Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          <HodDailyReportForm editDate={date} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
