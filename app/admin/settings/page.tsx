import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <AppShell title="System Settings" role={user.role}>
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configure teams, approval policies, lock rules, and application-level preferences.
        </CardContent>
      </Card>
    </AppShell>
  );
}
