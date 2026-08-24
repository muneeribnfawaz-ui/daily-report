import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuditLogsViewer } from "@/components/admin/audit-logs-viewer";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Audit Logs" role={user.role}>
      <AuditLogsViewer />
    </AppShell>
  );
}
