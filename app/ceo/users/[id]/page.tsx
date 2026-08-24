import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { UserViewScreen } from "@/components/admin/user-view-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoUserDetailPage({
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
    <AppShell title="User Profile" role={user.role}>
      <UserViewScreen
        userId={id}
        backHref="/ceo/users"
        editHref={`/ceo/users/${id}/edit`}
        reportHref="/ceo/reports"
      />
    </AppShell>
  );
}
