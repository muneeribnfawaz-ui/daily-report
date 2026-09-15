import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MyReportList } from "@/components/reports/my-report-list";
import { getCurrentUser } from "@/lib/auth";

export default async function TeamLeadMyReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="My Reports" role={user.role}>
      <MyReportList showHeader />
    </AppShell>
  );
}
