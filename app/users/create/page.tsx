import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserCreateScreen } from "@/components/admin/user-create-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function TopLevelCreateUserPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/users");
  }

  return (
    <AppShell title="Create User" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Add User"
          description="Create staff profiles with manager and team values filled in automatically where appropriate."
        />
        <UserCreateScreen currentUser={user} />
      </div>
    </AppShell>
  );
}
