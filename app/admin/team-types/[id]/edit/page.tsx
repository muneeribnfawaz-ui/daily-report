import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TeamTypeForm } from "@/components/admin/team-type-form";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminEditTeamTypePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await Promise.resolve(params);
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Edit Team Type" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Directory Settings"
          title="Edit Team Type"
          description="Update the display name and status. The internal name stays locked after creation."
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/admin/team-types" title="Back" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <Card>
          <CardContent className="pt-6">
            <TeamTypeForm mode="edit" teamTypeId={id} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
