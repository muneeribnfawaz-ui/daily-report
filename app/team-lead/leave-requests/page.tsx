import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { LeaveRequestCenter } from "@/components/leave/leave-request-center";

export default async function TeamLeadLeaveRequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "team_lead") {
    if (!user) redirect("/login");
    redirect("/leave-requests");
  }

  return (
    <AppShell title="Leave Requests" role={user.role} sidebarVariant="daily-report">
      <LeaveRequestCenter />
    </AppShell>
  );
}
