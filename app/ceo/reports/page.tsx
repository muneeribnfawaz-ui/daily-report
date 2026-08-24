import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminReportsContent } from "@/components/admin/admin-reports-content";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoReportsPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Reports Management" role={user.role}>
      <AdminReportsContent />
    </AppShell>
  );
}
