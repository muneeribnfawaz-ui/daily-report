import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
        <CardHeader className="flex flex-row items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href="/marketing/my-reports" title="Back" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Marketing Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketingReportForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
