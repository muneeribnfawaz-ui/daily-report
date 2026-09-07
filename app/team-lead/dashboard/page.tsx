import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OperationsDashboardContent } from "@/components/dashboard/operations-dashboard-content";
import { getCurrentUser } from "@/lib/auth";

export default async function TeamLeadDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }
  if (user.role === "ceo") {
    redirect("/ceo/dashboard");
  }
  if (user.role === "team_member") {
    redirect("/tm/dashboard");
  }

  return (
    <AppShell title="Team Lead Dashboard" role={user.role}>
      <OperationsDashboardContent />
    </AppShell>
  );
}
