import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserViewScreen } from "@/components/admin/user-view-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminUserDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <AppShell title="User Details" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Access Control"
          title="User Details"
          description="View the user profile and jump directly to edit or report actions."
        />
        <UserViewScreen
          userId={id}
          backHref="/admin/users"
          editHref={`/admin/users/${id}/edit`}
          reportHref="/admin/reports"
        />
      </div>
    </AppShell>
  );
}
