import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MyReportList } from "@/components/reports/my-report-list";
import { getCurrentUser } from "@/lib/auth";
import { isInFinance, isInConstruction, isInMarketing } from "@/lib/permissions";

export default async function MyReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Non-HOD Finance users are redirected to Finance My Reports. HODs see all reports created by them across departments.
  const isFinance = isInFinance(user) && user.role !== "hod";
  if (isFinance) {
    redirect("/finance/my-reports");
  }

  const isConstruction = isInConstruction(user) && user.role !== "hod";
  if (isConstruction) {
    redirect("/construction/my-reports");
  }

  const isMarketing = isInMarketing(user) && user.role !== "hod";
  if (isMarketing) {
    redirect("/marketing/my-reports");
  }

  return (
    <AppShell title="My Report" role={user.role} sidebarVariant="daily-report">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">My Report</div>
            <p className="mt-2 text-sm text-muted-foreground">View, edit, or delete reports created by you across all departments.</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/daily-report/create">Create Report</Link>
          </Button>
        </div>
        <MyReportList />
      </div>
    </AppShell>
  );
}
