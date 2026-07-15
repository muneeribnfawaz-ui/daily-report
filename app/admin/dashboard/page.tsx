import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader, DashboardPanel, DashboardStatCard } from "@/components/dashboard/ui";
import { FinanceDashboardSection } from "@/components/finance/finance-dashboard-section";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Admin Dashboard" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="System Control"
          title="Manage users, reports, and configuration from one command center"
          description="This view highlights platform health, access control, and compliance signals for administrators."
          actions={
            <>
              <Button asChild>
                <Link href="/admin/users">Manage Users</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/team-types">Team Types</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/settings">System Settings</Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard label="Total Users" value="128" delta="12 new" accent="from-primary/20 via-primary/5 to-transparent" />
          <DashboardStatCard label="Total Employees" value="104" delta="Most active role" accent="from-primaryDark/20 via-primaryDark/5 to-transparent" />
          <DashboardStatCard label="Total Reports" value="1,248" delta="Growing steadily" accent="from-success/20 via-success/5 to-transparent" />
          <DashboardStatCard label="Active Users" value="122" delta="95% uptime" accent="from-warning/20 via-warning/5 to-transparent" />
        </div>

        {/* Finance Section */}
        <div className="border-t pt-6">
          <FinanceDashboardSection />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardPanel title="Platform Health" subtitle="Current state of the workflow engine">
            <div className="space-y-4">
              {[
                ["Auth Service", "Healthy", "text-success"],
                ["MongoDB Connection", "Healthy", "text-success"],
                ["PDF Generation", "Queued", "text-warning"],
                ["Audit Logging", "Healthy", "text-success"]
              ].map(([label, status, color]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <div className="font-medium">{label}</div>
                  <div className={color}>{status}</div>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Admin Priorities" subtitle="Most common next actions">
            <div className="space-y-3">
              {[
                "Add or suspend users",
                "Review locked reports",
                "Inspect audit trails",
                "Update system settings"
              ].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3">
                  <div className="text-sm">{item}</div>
                  <Badge variant="soft">Open</Badge>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </AppShell>
  );
}
