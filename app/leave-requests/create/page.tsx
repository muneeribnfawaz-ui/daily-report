import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { LeaveRequestCreateForm } from "@/components/leave/leave-request-create-form";

export default async function CreateLeaveRequestPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="Create Leave Request" role={user.role} sidebarVariant="daily-report">
      <LeaveRequestCreateForm />
    </AppShell>
  );
}
