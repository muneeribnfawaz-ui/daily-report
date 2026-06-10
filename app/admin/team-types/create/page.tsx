import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamTypeForm } from "@/components/admin/team-type-form";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminCreateTeamTypePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <AppShell title="Create Team Type" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Directory Settings"
          title="Create Team Type"
          description="Add a new team type. The internal name is generated automatically from the display name."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/team-types">Back to Team Types</Link>
            </Button>
          }
        />
        <Card>
          <CardContent className="pt-6">
            <TeamTypeForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
