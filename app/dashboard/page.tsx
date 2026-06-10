import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader, DashboardPanel, DashboardStatCard } from "@/components/dashboard/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function EmployeeDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="Employee Dashboard" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Daily Workflow"
          title="Stay on top of your report activity"
          description="Submit reports, track approvals, and review your history from a calm, high-clarity workspace."
          actions={
            <>
              <Button asChild>
                <Link href="/daily-report/create">New Report</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/daily-report/my-reports">View History</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/leave-requests">Leave Requests</Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard label="Reports Submitted" value="12" delta="+2 this week" accent="from-primary/20 via-primary/5 to-transparent" />
          <DashboardStatCard label="Pending Approval" value="3" delta="Needs attention" accent="from-warning/20 via-warning/5 to-transparent" />
          <DashboardStatCard label="Approved Reports" value="8" delta="Stable trend" accent="from-success/20 via-success/5 to-transparent" />
          <DashboardStatCard label="Rejected Reports" value="1" delta="Review feedback" accent="from-danger/20 via-danger/5 to-transparent" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <DashboardPanel
            title="Recent Submissions"
            subtitle="Your latest reports and current review state"
          >
            <div className="space-y-3">
              {[
                ["Today", "Backend", "Submitted"],
                ["Yesterday", "Web", "Approved"],
                ["Mon", "QA", "Pending"]
              ].map(([date, team, status]) => (
                <div key={`${date}-${team}`} className="flex flex-col gap-3 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{date}</div>
                    <div className="text-sm text-muted-foreground">{team} team report</div>
                  </div>
                  <Badge variant={status === "Approved" ? "soft" : "outline"}>{status}</Badge>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Quick Tips" subtitle="A few helpful reminders">
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-background/70 p-4">
                Keep your daily meeting update concise and action-focused.
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                Locked reports cannot be edited once they are included in a finalized consolidated report.
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                Use blockers and clarification fields to surface issues early.
              </div>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </AppShell>
  );
}
