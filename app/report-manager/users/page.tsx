import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { AdminUserList } from "@/components/admin/user-list";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { getCurrentUser } from "@/lib/auth";

export default async function ReportManagerUsersPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    redirect("/login");
  }

  return (
    <AppShell title="Users" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Managed Users"
          description="Review and update the users that report to your team hierarchy."
          actions={<CreateUserButton />}
        />
        <AdminUserList
          endpoint="/api/report-manager/users"
          editBaseHref="/report-manager/users"
          viewBaseHref="/report-manager/users"
          reportBaseHref="/report-manager/reports"
        />
      </div>
    </AppShell>
  );
}
