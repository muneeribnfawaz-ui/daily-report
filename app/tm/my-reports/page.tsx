import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MyReportList } from "@/components/reports/my-report-list";
import { getCurrentUser } from "@/lib/auth";
import { isInFinance } from "@/lib/permissions";

export default async function TmMyReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "team_member") {
    if (!user) redirect("/login");
    redirect("/dashboard");
  }

  const isFinance = isInFinance(user);
  if (isFinance) {
    redirect("/finance/my-reports");
  }

  return (
    <AppShell title="My Reports" role={user.role} sidebarVariant="daily-report">
      <MyReportList showHeader />
    </AppShell>
  );
}
