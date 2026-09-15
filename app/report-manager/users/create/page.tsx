import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserCreateScreen } from "@/components/admin/user-create-screen";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function ReportManagerCreateUserPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin/users/create");
  }
  if (user.role === "ceo") {
    redirect("/ceo/users/create");
  }
  if (user.role === "hod") {
    redirect("/hod/users/create");
  }
  if (user.role !== "report_manager") {
    redirect("/login");
  }

  const plainUser = JSON.parse(JSON.stringify(user));

  return (
    <AppShell title="Create Employee" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Add Employee"
          description="Create staff profiles with manager and team values filled in automatically for your report manager scope."
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/report-manager/users" title="Back" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <UserCreateScreen currentUser={plainUser} />
      </div>
    </AppShell>
  );
}
