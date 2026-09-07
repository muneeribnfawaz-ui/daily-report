import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserEditForm } from "@/components/admin/user-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function HodEditUserPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "hod") {
    if (!user) redirect("/login");
    redirect("/users");
  }

  return (
    <AppShell title="Edit Employee" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Edit Employee"
          description="Update details for the employees in your department."
          actions={
            <Button asChild variant="outline">
              <Link href="/hod/users">Back to Employees</Link>
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <UserEditForm userId={id} backHref="/hod/users" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
