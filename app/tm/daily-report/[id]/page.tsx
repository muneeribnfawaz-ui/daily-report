import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditReportForm } from "@/components/reports/edit-report-form";
import { getCurrentUser } from "@/lib/auth";

export default async function TmDailyReportEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "team_member") {
    if (!user) redirect("/login");
    redirect("/dashboard");
  }

  return (
    <AppShell title="Edit Daily Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader>
          <CardTitle>Edit Report</CardTitle>
        </CardHeader>
        <CardContent>
          <EditReportForm reportId={id} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
