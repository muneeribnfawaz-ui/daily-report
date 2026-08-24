import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CreateUserScreen } from "@/components/admin/create-user-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoCreateUserPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Create User" role={user.role}>
      <CreateUserScreen
        backHref="/ceo/users"
        successHref="/ceo/users"
      />
    </AppShell>
  );
}
