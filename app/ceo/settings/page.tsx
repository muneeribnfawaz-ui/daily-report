import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Settings" role={user.role}>
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Platform configurations and system preferences.
        </CardContent>
      </Card>
    </AppShell>
  );
}
