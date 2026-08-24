import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Admin Dashboard" role={user.role}>
      <AdminDashboardContent />
    </AppShell>
  );
}
