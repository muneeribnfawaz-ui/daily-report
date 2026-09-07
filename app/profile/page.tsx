import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileUpdateForm } from "@/components/profile/profile-update-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    include: {
      workspaceMembers: {
        where: { workspaceId: user.workspaceId, isActive: true },
        include: { departments: true }
      }
    }
  });

  const member = dbUser?.workspaceMembers[0];

  const rawDepartments = member?.departments ?? user.departments ?? [];
  const cleanDepartments = rawDepartments.map((d: any) => ({
    name: String(d.name ?? ""),
    subTeams: Array.isArray(d.subTeams) ? d.subTeams.map((st: any) => String(st)) : []
  }));

  return (
    <AppShell title="Profile" role={user.role} sidebarVariant="daily-report">
      <ProfileUpdateForm
        profile={{
          name: dbUser?.name ?? user.name,
          firstName: dbUser?.firstName ?? undefined,
          lastName: dbUser?.lastName ?? undefined,
          dateOfBirth: dbUser?.dateOfBirth ? String(dbUser.dateOfBirth) : undefined,
          secondaryPhone: dbUser?.secondaryPhone ?? undefined,
          email: dbUser?.email ?? user.email,
          empID: member?.empID ?? undefined,
          teamName: member?.teamName ?? user.teamName ?? undefined,
          teamNames: member?.teamNames?.length ? member.teamNames : (member?.teamName ? [member.teamName] : user.teamName ? [user.teamName] : []),
          departments: cleanDepartments,
          managerName: member?.managerName ?? undefined,
          status: member?.status ?? user.status ?? undefined,
          createdAt: dbUser?.createdAt ? String(dbUser.createdAt) : undefined,
          role: member?.role ?? dbUser?.role ?? user.role,
          phone: dbUser?.phone ?? undefined,
          isActive: member?.isActive ?? undefined,
          isDeleted: dbUser?.isDeleted ?? undefined,
          isAdminActive: dbUser?.isAdminActive ?? undefined,
          isEmailActivated: dbUser?.isEmailActivated ?? undefined
        }}
      />
    </AppShell>
  );
}
