import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
        <CardHeader className="flex flex-row items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href="/construction/my-reports" title="Back" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Construction Report Form</CardTitle>
        </CardHeader>
        <CardContent>
          <ConstructionReportForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
