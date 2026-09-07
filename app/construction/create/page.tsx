import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConstructionReportForm } from "@/components/forms/construction-report-form";
import { getCurrentUser } from "@/lib/auth";
import { isInConstruction } from "@/lib/permissions";

export default async function CreateConstructionReportPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isInConstruction(user) && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Create Construction Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader>
          <CardTitle>Construction Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          <ConstructionReportForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
