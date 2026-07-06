import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader, DashboardPanel, DashboardStatCard } from "@/components/dashboard/ui";
import Link from "next/link";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { getCurrentUser } from "@/lib/auth";

export default async function ReportManagerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Report Manager Dashboard" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Manager Console"
          title="Review, consolidate, and lock reports with precision"
          description="Monitor team output, approve submissions, and generate consolidated PDFs from a focused operations dashboard."
          actions={
            <>
              <CreateUserButton />
              <Button asChild variant="outline">
                <Link href="/daily-report/create">New Daily Report</Link>
              </Button>
              <Button asChild>
                <Link href="/report-manager/reports">Open Reports</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/report-manager/consolidated-reports/create">New Consolidated Report</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/leave-requests">Leave Requests</Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard label="Total Reports Today" value="34" delta="+6 vs yesterday" accent="from-primary/20 via-primary/5 to-transparent" />
          <DashboardStatCard label="Pending Reports" value="6" delta="Awaiting review" accent="from-warning/20 via-warning/5 to-transparent" />
          <DashboardStatCard label="Approved Reports" value="22" delta="Strong throughput" accent="from-success/20 via-success/5 to-transparent" />
          <DashboardStatCard label="Locked Reports" value="18" delta="Finalized" accent="from-cardBorder/20 via-cardBorder/5 to-transparent" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardPanel title="Review Queue" subtitle="High priority reports needing a decision">
            <div className="space-y-3">
              {[
                ["Asha", "Backend", "Pending", "Needs clarification"],
                ["Rohit", "Web", "Submitted", "Awaiting approval"],
                ["Meera", "QA", "Approved", "Ready for consolidation"]
              ].map(([name, team, status, note]) => (
                <div key={`${name}-${team}`} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-muted-foreground">{team} team</div>
                    </div>
                    <Badge variant={status === "Approved" ? "soft" : "outline"}>{status}</Badge>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">{note}</div>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Operational Snapshot" subtitle="Fast insight into system state">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Consolidation Ready", "11"],
                ["Reports With Blockers", "4"],
                ["Missing Reports", "2"],
                ["PDF Exports", "9"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border bg-background/70 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
                  <div className="mt-3 text-2xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </AppShell>
  );
}
