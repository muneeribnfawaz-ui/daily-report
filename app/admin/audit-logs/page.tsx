import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminAuditLogsContent } from "@/components/admin/admin-audit-logs-content";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Audit Logs" role={user.role}>
      <AdminAuditLogsContent />
    </AppShell>
  );
}
