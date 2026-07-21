import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader, DashboardPanel, DashboardStatCard } from "@/components/dashboard/ui";
import Link from "next/link";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import DailyReport from "@/models/DailyReport";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

export default async function ReportManagerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  await connectToDatabase();
  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user);
  
  const conditions: Record<string, unknown>[] = [];
  if (visibleEmployeeIds) {
    conditions.push({ employeeId: { $in: visibleEmployeeIds } });
  }
  conditions.push({ status: { $in: ["submitted", "pending", "clarification_needed", "approved"] } });
  
  const filter = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { $and: conditions };
  
  const recentReports = await DailyReport.find(filter)
    .sort({ reportDate: -1, createdAt: -1 })
    .limit(5)
    .select("name teamName status blockers requiredClarification pendingWork")
    .lean() as any[];

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
              {recentReports.length > 0 ? (
                recentReports.map((report) => {
                  let note = report.pendingWork || report.blockers || report.requiredClarification || "Awaiting review";
                  if (note.length > 45) note = note.substring(0, 45) + "...";
                  return (
                    <div key={String(report._id)} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{report.name || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">{report.teamName || "General"} team</div>
                        </div>
                        <Badge variant={report.status === "approved" ? "soft" : "outline"}>
                          {report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1).replace("_", " ") : "Submitted"}
                        </Badge>
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground">{note}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  No reports waiting for review.
                </div>
              )}
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
