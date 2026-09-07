"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { CeoApprovalSection } from "@/components/reports/ceo-approval-section";
import { useSession } from "@/hooks/use-session";

type ManagedReport = ReportSheetEntry & {
  editAccessRequested?: boolean;
  editAccessRequestReason?: string;
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
  const [isUpdatingEdit, setIsUpdatingEdit] = useState(false);

  const reportQuery = useQuery({
    queryKey: ["report-detail", reportId],
    queryFn: async () => {
      const response = await api.get(`/api/report-manager/reports/${reportId}`);
      return response.data?.data as ManagedReport;
    }
  });

  const handleEditApproval = async (approve: boolean) => {
    setIsUpdatingEdit(true);
    try {
      await api.post(`/api/reports/${reportId}/approve-edit`, { approve });
      await reportQuery.refetch();
    } finally {
      setIsUpdatingEdit(false);
    }
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 p-4 shadow-sm">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            {report.editAccessRequested ? <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-300 font-bold">Edit Requested</Badge> : null}
            {report.editAccessGranted ? <Badge variant="soft" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold">Edit Enabled</Badge> : null}
            {!report.editAccessRequested && !report.editAccessGranted ? (
              <div className="text-sm text-muted-foreground">No edit request for this report.</div>
            ) : null}
          </div>
          {report.editAccessRequested && report.editAccessRequestReason ? (
            <div className="mt-1 text-xs bg-card/90 border border-amber-300/40 rounded-lg p-2.5 text-textPrimary">
              <span className="font-semibold text-amber-800 dark:text-amber-300">Reason for Request: </span>
              <span className="italic">"{report.editAccessRequestReason}"</span>
            </div>
          ) : null}
        </div>
        {report.editAccessRequested && sessionUser?.role && ["admin", "ceo", "hod", "team_lead"].includes(sessionUser.role) && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-danger/30 text-danger hover:bg-danger/10" onClick={() => handleEditApproval(false)} disabled={isUpdatingEdit}>
              Reject Edit
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold" onClick={() => handleEditApproval(true)} disabled={isUpdatingEdit}>
              Approve Edit
            </Button>
          </div>
        )}
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
