import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileUpdateForm } from "@/components/profile/profile-update-form";

type ProfileUserRecord = {
  name?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  secondaryPhone?: string;
  empID?: string;
  email?: string;
  phone?: string;
  role?: string;
  teamName?: string;
  teamNames?: string[];
  managerName?: string;
  status?: "active" | "inactive" | "suspended" | string;
  isActive?: boolean;
  isDeleted?: boolean;
  isAdminActive?: boolean;
  isEmailActivated?: boolean;
  createdAt?: string;
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await connectToDatabase();
  const profile = (await User.findById(user.id).lean()) as ProfileUserRecord | null;

  return (
    <AppShell title="Profile" role={user.role} sidebarVariant="daily-report">
      <ProfileUpdateForm
        profile={{
          name: profile?.name ?? user.name,
          firstName: profile?.firstName,
          lastName: profile?.lastName,
          dateOfBirth: profile?.dateOfBirth,
          secondaryPhone: profile?.secondaryPhone,
          email: profile?.email ?? user.email,
          empID: profile?.empID,
          teamName: profile?.teamName ?? user.teamName ?? undefined,
          teamNames: profile?.teamNames ?? (profile?.teamName ? [profile.teamName] : user.teamName ? [user.teamName] : []),
          managerName: profile?.managerName ?? undefined,
          status: profile?.status ?? user.status ?? undefined,
          createdAt: profile?.createdAt,
          role: profile?.role ?? user.role,
          phone: profile?.phone,
          isActive: profile?.isActive,
          isDeleted: profile?.isDeleted,
          isAdminActive: profile?.isAdminActive,
          isEmailActivated: profile?.isEmailActivated
        }}
      />
    </AppShell>
  );
}
