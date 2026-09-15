import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserCreateScreen } from "@/components/admin/user-create-screen";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoCreateUserPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin/users/create");
  }
  if (user.role === "hod") {
    redirect("/hod/users/create");
  }
  if (user.role === "report_manager") {
    redirect("/report-manager/users/create");
  }
  if (user.role !== "ceo") {
    redirect("/login");
  }

  const plainUser = JSON.parse(JSON.stringify(user));

  return (
    <AppShell title="Create Employee" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Executive Access"
          title="Add Employee"
          description="Create employee profiles with role, department, and team assignment."
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/ceo/users" title="Back" aria-label="Back">
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
