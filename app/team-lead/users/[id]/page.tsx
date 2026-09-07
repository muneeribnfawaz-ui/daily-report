import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserViewScreen } from "@/components/admin/user-view-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function TeamLeadUserDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "team_lead") {
    if (!user) redirect("/login");
    redirect("/users");
  }

  const { id } = await params;

  return (
    <AppShell title="User Details" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Team Member Details"
          description="View the managed team member profile and jump directly to edit or report actions."
        />
        <UserViewScreen
          userId={id}
          backHref="/team-lead/users"
          editHref={`/team-lead/users/${id}/edit`}
          reportHref="/team-lead/reports"
        />
      </div>
    </AppShell>
  );
}
