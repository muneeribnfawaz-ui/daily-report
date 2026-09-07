import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OperationsDashboardContent } from "@/components/dashboard/operations-dashboard-content";
import { getCurrentUser } from "@/lib/auth";

export default async function HodDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "hod") {
    if (!user) redirect("/login");
    redirect("/dashboard");
  }

  return (
    <AppShell title="HOD Dashboard" role={user.role}>
      <OperationsDashboardContent />
    </AppShell>
  );
}
