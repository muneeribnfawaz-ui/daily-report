import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserEditForm } from "@/components/admin/user-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoEditUserPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Edit Employee" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Access Control"
          title="Edit Employee"
          description="Update profile fields, roles, status flags, and manager assignments."
          actions={
            <Button asChild variant="outline">
              <Link href="/ceo/users">Back to Employees</Link>
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Employee Details</CardTitle>
          </CardHeader>
          <CardContent>
            <UserEditForm userId={id} backHref="/ceo/users" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
