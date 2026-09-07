import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { UserCreateScreen } from "@/components/admin/user-create-screen";
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
      <UserCreateScreen currentUser={plainUser} />
    </AppShell>
  );
}
