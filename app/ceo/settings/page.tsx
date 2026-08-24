import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsManager } from "@/components/admin/settings-manager";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Settings" role={user.role}>
      <SettingsManager />
    </AppShell>
  );
}
