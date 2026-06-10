import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserViewScreen } from "@/components/admin/user-view-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function ReportManagerUserDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <AppShell title="User Details" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="User Details"
          description="View the managed user profile and jump directly to edit or report actions."
        />
        <UserViewScreen
          userId={id}
          backHref="/report-manager/users"
          editHref={`/report-manager/users/${id}/edit`}
          reportHref="/report-manager/reports"
        />
      </div>
    </AppShell>
  );
}
