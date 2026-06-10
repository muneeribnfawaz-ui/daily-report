import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserEditForm } from "@/components/admin/user-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminEditUserPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <AppShell title="Edit User" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Access Control"
          title="Edit User"
          description="Update profile fields, roles, status flags, and manager assignments."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/users">Back to Users</Link>
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <UserEditForm userId={id} backHref="/admin/users" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
