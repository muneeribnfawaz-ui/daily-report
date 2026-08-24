import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyReportForm } from "@/components/forms/daily-report-form";
import { getCurrentUser } from "@/lib/auth";

export default async function CreateDailyReportPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="Create Daily Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader>
          <CardTitle>Daily Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyReportForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
