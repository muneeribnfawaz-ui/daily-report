import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OperationsDashboardContent } from "@/components/dashboard/operations-dashboard-content";
import { getCurrentUser } from "@/lib/auth";

export default async function TopLevelDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Operations Dashboard" role={user.role}>
      <OperationsDashboardContent />
    </AppShell>
  );
}
