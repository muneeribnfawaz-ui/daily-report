import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminCompaniesContent } from "@/components/admin/admin-companies-content";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function AdminCompaniesPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Companies Management" role={user.role}>
      <AdminCompaniesContent />
    </AppShell>
  );
}
