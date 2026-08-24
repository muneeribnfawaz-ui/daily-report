"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader, DashboardPanel, DashboardStatCard } from "@/components/dashboard/ui";
import Link from "next/link";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { useSelectedCompany } from "@/hooks/use-selected-company";

type OperationsDashboardData = {
  totalReportsToday: number;
  pendingReports: number;
  approvedReports: number;
  lockedReports: number;
  recentReports: Array<{
    _id: string;
    name: string;
    teamName: string;
    status: string;
    blockers?: string;
    requiredClarification?: string;
    pendingWork?: string;
  }>;
  operationalSnapshot: {
    consolidationReady: number;
    reportsWithBlockers: number;
    missingReports: number;
    pdfExports: number;
  };
};

export function OperationsDashboardContent() {
  const selectedCompanyId = useSelectedCompany();

  const { data, isLoading } = useQuery<OperationsDashboardData>({
    queryKey: ["operations-dashboard-stats", selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId
        ? `/api/dashboard/stats?workspaceId=${encodeURIComponent(selectedCompanyId)}`
        : "/api/dashboard/stats";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch operations dashboard stats");
      const json = await res.json();
      return json.data as OperationsDashboardData;
    }
  });

  const recentReports = data?.recentReports || [];
  const snapshot = data?.operationalSnapshot || {
    consolidationReady: 0,
    reportsWithBlockers: 0,
    missingReports: 0,
    pdfExports: 0
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Management Console"
        title="Review, consolidate, and monitor daily progress"
        description="Track team output, review submissions, and manage operational daily reports."
        actions={
          <>
            <CreateUserButton />
            <Button asChild variant="outline">
              <Link href="/daily-report/create">New Daily Report</Link>
            </Button>
            <Button asChild>
              <Link href="/reports">Open Reports</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/consolidated-reports">Consolidated Reports</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/leave-requests">Leave Requests</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Total Reports Today"
          value={isLoading ? "..." : String(data?.totalReportsToday ?? 0)}
          delta="Today's submissions"
          accent="from-primary/20 via-primary/5 to-transparent"
        />
        <DashboardStatCard
          label="Pending Reports"
          value={isLoading ? "..." : String(data?.pendingReports ?? 0)}
          delta="Awaiting review"
          accent="from-warning/20 via-warning/5 to-transparent"
        />
        <DashboardStatCard
          label="Approved Reports"
          value={isLoading ? "..." : String(data?.approvedReports ?? 0)}
          delta="Approved"
          accent="from-success/20 via-success/5 to-transparent"
        />
        <DashboardStatCard
          label="Locked Reports"
          value={isLoading ? "..." : String(data?.lockedReports ?? 0)}
          delta="Finalized"
          accent="from-cardBorder/20 via-cardBorder/5 to-transparent"
        />
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
              <div className="p-4 text-center text-sm text-muted-foreground">
                No reports waiting for review.
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Operational Snapshot" subtitle="Fast insight into system state">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Consolidation Ready", String(snapshot.consolidationReady)],
              ["Reports With Blockers", String(snapshot.reportsWithBlockers)],
              ["Missing Reports", String(snapshot.missingReports)],
              ["PDF Exports", String(snapshot.pdfExports)]
            ].map(([label, val]) => (
              <div key={label} className="rounded-2xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
                <div className="mt-3 text-2xl font-semibold">{val}</div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
