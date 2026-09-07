import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingReportForm } from "@/components/forms/marketing-report-form";
import { getCurrentUser } from "@/lib/auth";
import { isInMarketing } from "@/lib/permissions";

export default async function CreateMarketingReportPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isInMarketing(user) && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Create Marketing Report" role={user.role} sidebarVariant="daily-report">
      <Card>
        <CardHeader>
          <CardTitle>Marketing Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketingReportForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
