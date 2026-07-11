"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { CeoApprovalSection } from "@/components/reports/ceo-approval-section";
import { useSession } from "@/hooks/use-session";

type ManagedReport = ReportSheetEntry & {
  editAccessRequested?: boolean;
  editAccessGranted?: boolean;
  isLocked?: boolean;
};

function groupReportsByTeam(reports: ReportSheetEntry[]): ReportSheetTeamGroup[] {
  const groups = new Map<string, ReportSheetEntry[]>();
  for (const report of reports) {
    const current = groups.get(report.teamName) ?? [];
    current.push(report);
    groups.set(report.teamName, current);
  }

  return Array.from(groups.entries()).map(([teamName, teamReports]) => ({
    teamName,
    dailyMeetingUpdate: teamReports.find((item) => item.dailyMeetingUpdate?.trim())?.dailyMeetingUpdate?.trim() ?? "",
    dailyMeetingUpdates: teamReports
      .filter((item) => item.dailyMeetingUpdate?.trim())
      .map((item) => ({
        employeeId: item.employeeId,
        name: item.name,
        role: item.employeeRole ?? null,
        update: item.dailyMeetingUpdate?.trim() ?? ""
      })),
    reports: teamReports
  }));
}

export function ReportDetailExplorer({ reportId }: { reportId: string }) {
  const { data: sessionUser } = useSession();
  const reportQuery = useQuery({
    queryKey: ["report-detail", reportId],
    queryFn: async () => {
      const response = await api.get(`/api/report-manager/reports/${reportId}`);
      return response.data?.data as ManagedReport;
    }
  });

  const report = reportQuery.data;
  const dateLabel = report ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(report.reportDate)) : "";
  const singlePreviewGroups = useMemo<ReportSheetTeamGroup[]>(
    () =>
      report
      ? [
            {
              teamName: report.teamName,
              dailyMeetingUpdate: report.dailyMeetingUpdate?.trim() ?? "",
              dailyMeetingUpdates: report.dailyMeetingUpdate?.trim()
                ? [
                    {
                      employeeId: report.employeeId,
                      name: report.name,
                      role: report.employeeRole ?? null,
                      update: report.dailyMeetingUpdate.trim()
                    }
                  ]
                : [],
              reports: [report]
            }
          ]
        : [],
    [report]
  );

  if (reportQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading report details...</div>;
  }

  if (reportQuery.isError || !report) {
    return <div className="text-sm text-danger">Failed to load the report.</div>;
  }

  const approvalItems = report.nextDayApprovalItems ?? [];
  const isCeo = sessionUser?.role === "ceo";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-background/70 p-4">
        {report.editAccessRequested ? <Badge variant="outline">Edit requested</Badge> : null}
        {report.editAccessGranted ? <Badge variant="soft">Edit enabled</Badge> : null}
        {!report.editAccessRequested && !report.editAccessGranted ? (
          <div className="text-sm text-muted-foreground">No edit request for this report.</div>
        ) : null}
      </div>
      <ReportSheetPreview title="Daily Team Progress Report" dateLabel={dateLabel} teamGroups={singlePreviewGroups} />
      {approvalItems.length > 0 ? (
        <CeoApprovalSection
          reportId={reportId}
          items={approvalItems.map((item) => ({
            particulars: item.particulars ?? "",
            amountINR: item.amountINR ?? 0,
            amountRiyal: item.amountRiyal ?? 0,
            reason: item.reason ?? "",
            review: item.review ?? "",
            approval: (item.approval as "pending" | "yes" | "no") ?? "pending"
          }))}
          isCeo={isCeo}
          onUpdate={() => reportQuery.refetch()}
        />
      ) : null}
    </div>
  );
}
