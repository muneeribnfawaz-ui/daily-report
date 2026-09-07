import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserCreateScreen } from "@/components/admin/user-create-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function TeamLeadCreateUserPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin/users/create");
  }
  if (user.role === "ceo") {
    redirect("/ceo/users/create");
  }
  if (user.role === "hod") {
    redirect("/hod/users/create");
  }
  if (user.role === "report_manager") {
    redirect("/report-manager/users/create");
  }
  if (user.role !== "team_lead") {
    redirect("/login");
  }

  const plainUser = JSON.parse(JSON.stringify(user));

  return (
    <AppShell title="Create Team Member" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Add Team Member"
          description="Create team member profiles automatically assigned to your team lead supervision."
        />
        <UserCreateScreen currentUser={plainUser} />
      </div>
    </AppShell>
  );
}
