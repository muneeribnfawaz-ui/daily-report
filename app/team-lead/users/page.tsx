import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { AdminUserList } from "@/components/admin/user-list";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { getCurrentUser } from "@/lib/auth";
import { isInFinance } from "@/lib/permissions";

export default async function TeamLeadUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "team_lead") {
    if (!user) redirect("/login");
    if (user.role === "admin") redirect("/admin/users");
    if (user.role === "ceo") redirect("/ceo/users");
    if (user.role === "hod") redirect("/hod/users");
    if (user.role === "report_manager") redirect("/report-manager/users");
    redirect("/login");
  }

  const reportBaseHref = isInFinance(user) ? "/finance" : "/team-lead/reports";

  return (
    <AppShell title="My Team" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="My Team"
          description="Review and manage team members assigned to your team."
          actions={<CreateUserButton href="/team-lead/users/create" />}
        />
        <AdminUserList
          endpoint="/api/report-manager/users"
          editBaseHref="/team-lead/users"
          viewBaseHref="/team-lead/users"
          reportBaseHref={reportBaseHref}
        />
      </div>
    </AppShell>
  );
}
