import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <AppShell title="Audit Logs" role={user.role}>
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Action history, before/after values, timestamps, and unlock reasons are exposed here.
        </CardContent>
      </Card>
    </AppShell>
  );
}
