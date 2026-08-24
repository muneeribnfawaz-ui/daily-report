import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="CEO Dashboard" role={user.role}>
      <AdminDashboardContent />
    </AppShell>
  );
}
