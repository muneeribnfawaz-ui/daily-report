import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserViewScreen } from "@/components/admin/user-view-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function HodUserDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "hod") {
    if (!user) redirect("/login");
    redirect("/users");
  }

  const { id } = await params;

  return (
    <AppShell title="User Details" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Employee Details"
          description="View employee profile, and jump directly to edit or report actions."
        />
        <UserViewScreen
          userId={id}
          backHref="/hod/users"
          editHref={`/hod/users/${id}/edit`}
          reportHref="/reports"
        />
      </div>
    </AppShell>
  );
}
