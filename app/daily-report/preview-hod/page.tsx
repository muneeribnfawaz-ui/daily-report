import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HodReportPreview } from "@/components/reports/hod-report-preview";
import { getCurrentUser } from "@/lib/auth";

export default async function PreviewHodDailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "hod") {
    redirect("/login");
  }

  const { date } = await searchParams;
  if (!date) {
    redirect("/daily-report/my-reports");
  }

  return (
    <AppShell title="Preview HOD Report" role={user.role} sidebarVariant="daily-report">
      <div className="space-y-4">
        <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
          <Link href="/reports" title="Back" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <HodReportPreview previewDate={date} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
