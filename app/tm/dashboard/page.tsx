import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OperationsDashboardContent } from "@/components/dashboard/operations-dashboard-content";
import { getCurrentUser } from "@/lib/auth";

export default async function TmDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "team_member") {
    if (!user) redirect("/login");
    redirect("/dashboard");
  }

  return (
    <AppShell title="Dashboard" role={user.role}>
      <OperationsDashboardContent />
    </AppShell>
  );
}
