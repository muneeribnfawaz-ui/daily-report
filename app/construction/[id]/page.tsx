import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditConstructionReportForm } from "@/components/reports/edit-construction-report-form";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";
import { canEditLockedReport } from "@/lib/permissions";
import { isInConstruction } from "@/lib/permissions";

export default async function EditConstructionReportPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isInConstruction(user) && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    redirect("/dashboard");
  }

  const reportId = params.id;
  const report = await db.dailyReport.findUnique({
    where: { id: reportId },
    include: {
      approvalItems: true,
      workPlans: true,
      materialUtilizations: true,
      tomorrowWorkPlans: true,
      marketingSelfItems: true,
      marketingClientItems: true,
    }
  });

  if (!report) {
    notFound();
  }

  const isAuthor = report.employeeId === user.id;
  const isSuperUser = canEditLockedReport(user);
  
  if (!isAuthor && !isSuperUser && user.role !== "team_lead" && user.role !== "hod") {
    redirect("/dashboard");
  }

  const mappedReport = {
    ...report,
    _id: report.id
  };

  return (
    <AppShell title="Edit Construction Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader>
          <CardTitle>Edit Construction Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          <EditConstructionReportForm initialData={mappedReport} reportId={reportId} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
