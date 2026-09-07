import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { AdminUserList } from "@/components/admin/user-list";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { getCurrentUser } from "@/lib/auth";

export default async function HodUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "hod") {
    if (!user) redirect("/login");
    if (user.role === "admin") redirect("/admin/users");
    if (user.role === "ceo") redirect("/ceo/users");
    if (user.role === "team_lead") redirect("/team-lead/users");
    if (user.role === "report_manager") redirect("/report-manager/users");
    redirect("/login");
  }

  return (
    <AppShell title="Employees" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Employees"
          description="Review and manage employees within your department."
          actions={<CreateUserButton href="/hod/users/create" />}
        />
        <AdminUserList
          endpoint="/api/report-manager/users"
          editBaseHref="/hod/users"
          viewBaseHref="/hod/users"
          reportBaseHref="/reports"
        />
      </div>
    </AppShell>
  );
}
