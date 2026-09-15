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

  // Non-HOD/Report Manager users are redirected to their department-specific My Reports if applicable.
  // HODs, Report Managers, Admins, and CEOs manage multi-department reports and stay on /daily-report/my-reports.
  const isExcludedRole = user.role === "hod" || user.role === "report_manager" || user.role === "admin" || user.role === "ceo";
  if (!isExcludedRole) {
    if (isInFinance(user)) {
      redirect("/finance/my-reports");
    }
    if (isInConstruction(user)) {
      redirect("/construction/my-reports");
    }
    if (isInMarketing(user)) {
      redirect("/marketing/my-reports");
    }
    if (user.role === "team_member") {
      redirect("/tm/my-reports");
    }
  }

  return (
    <AppShell title="My Report" role={user.role} sidebarVariant="daily-report">
      <MyReportList showHeader />
    </AppShell>
  );
}
