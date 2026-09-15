import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminSettingsContent } from "@/components/admin/admin-settings-content";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="System Settings" role={user.role}>
      <AdminSettingsContent />
    </AppShell>
  );
}
