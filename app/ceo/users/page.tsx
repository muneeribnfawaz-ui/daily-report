import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { AdminUserList } from "@/components/admin/user-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoUsersPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="User Management" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Access Control"
          title="Users"
          description="View the current user directory and create staff profiles."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/ceo/users/create">Add User</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/ceo/team-types">Team Types</Link>
              </Button>
            </div>
          }
        />
        <AdminUserList />
      </div>
    </AppShell>
  );
}
