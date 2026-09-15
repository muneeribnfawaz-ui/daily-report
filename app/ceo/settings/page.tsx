import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminSettingsContent } from "@/components/admin/admin-settings-content";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Settings" role={user.role}>
      <AdminSettingsContent />
    </AppShell>
  );
}
