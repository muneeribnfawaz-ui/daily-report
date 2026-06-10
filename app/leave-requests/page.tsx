import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { LeaveRequestCenter } from "@/components/leave/leave-request-center";

export default async function LeaveRequestsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="Leave Requests" role={user.role} sidebarVariant="daily-report">
      <LeaveRequestCenter />
    </AppShell>
  );
}
