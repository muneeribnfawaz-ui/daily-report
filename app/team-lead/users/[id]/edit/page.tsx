import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { UserEditForm } from "@/components/admin/user-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function TeamLeadEditUserPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "team_lead") {
    if (!user) redirect("/login");
    redirect("/users");
  }

  return (
    <AppShell title="Edit Team Member" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Team Access"
          title="Edit Team Member"
          description="Update details for the team members in your team."
          actions={
            <Button asChild variant="outline">
              <Link href="/team-lead/users">Back to My Team</Link>
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <UserEditForm userId={id} backHref="/team-lead/users" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
