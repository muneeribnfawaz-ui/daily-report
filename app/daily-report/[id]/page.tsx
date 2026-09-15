import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditReportForm } from "@/components/reports/edit-report-form";
import { getCurrentUser } from "@/lib/auth";

export default async function DailyReportEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="Edit Daily Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href="/daily-report/my-reports" title="Back" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Edit Report</CardTitle>
        </CardHeader>
        <CardContent>
          <EditReportForm reportId={id} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
