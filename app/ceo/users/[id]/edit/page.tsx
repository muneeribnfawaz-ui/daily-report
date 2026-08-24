import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EditUserScreen } from "@/components/admin/edit-user-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoEditUserPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);

  return (
    <AppShell title="Edit User" role={user.role}>
      <EditUserScreen
        userId={id}
        backHref="/ceo/users"
        successHref="/ceo/users"
      />
    </AppShell>
  );
}
