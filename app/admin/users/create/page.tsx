import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserCreateScreen } from "@/components/admin/user-create-screen";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminCreateUserPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { role } = await searchParams;

  if (role === "ceo" && user.role !== "admin") {
    redirect("/login");
  }

  if (user.role !== "admin" && user.role !== "ceo") {
    redirect("/login");
  }

  return (
    <AppShell title="Create User" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Access Control"
          title="Add User"
          description="Create staff profiles on a dedicated page with role, manager, and software type selection."
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/admin/users" title="Back" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <UserCreateScreen currentUser={user} />
      </div>
    </AppShell>
  );
}
