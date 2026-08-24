import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { AdminUserList } from "@/components/admin/user-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams?: Promise<{ role?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const isCeoView = resolvedParams.role === "ceo";

  return (
    <AppShell title={isCeoView ? "CEO Directory" : "User Management"} role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Access Control"
          title={isCeoView ? "CEOs" : "Users"}
          description={
            isCeoView
              ? "View and manage all CEO accounts in the system."
              : "View the current user directory and create staff profiles from a dedicated page."
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={isCeoView ? "/admin/users/create?role=ceo" : "/admin/users/create"}>
                  {isCeoView ? "Add CEO" : "Add User"}
                </Link>
              </Button>
              {!isCeoView && (
                <Button asChild variant="outline">
                  <Link href="/admin/team-types">Team Types</Link>
                </Button>
              )}
            </div>
          }
        />
        <AdminUserList />
      </div>
    </AppShell>
  );
}
