import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminReportsContent } from "@/components/admin/admin-reports-content";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Admin Reports" role={user.role}>
      <AdminReportsContent />
    </AppShell>
  );
}
