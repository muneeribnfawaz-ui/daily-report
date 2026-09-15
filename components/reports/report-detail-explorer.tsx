"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { CeoApprovalSection } from "@/components/reports/ceo-approval-section";
import { useSession } from "@/hooks/use-session";
import { useTranslation } from "@/lib/i18n";

type ManagedReport = ReportSheetEntry & {
  editAccessRequested?: boolean;
  editAccessRequestReason?: string;
  editAccessGranted?: boolean;
  isLocked?: boolean;
};

export function ReportDetailExplorer({ reportId }: { reportId: string }) {
  const { t } = useTranslation();
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
    return <div className="text-sm text-muted-foreground">{t("reports.loadingReportDetails")}</div>;
  }

  if (reportQuery.isError || !report) {
    return <div className="text-sm text-danger">{t("reports.failedToLoadReport")}</div>;
  }

  const approvalItems = report.nextDayApprovalItems ?? [];
  const isCeo = sessionUser?.role === "ceo";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 p-4 shadow-sm">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            {report.editAccessRequested ? <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-300 font-bold">{t("reports.editRequested")}</Badge> : null}
            {report.editAccessGranted ? <Badge variant="soft" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold">{t("reports.editEnabled")}</Badge> : null}
            {!report.editAccessRequested && !report.editAccessGranted ? (
              <div className="text-sm text-muted-foreground">{t("reports.noEditRequest")}</div>
            ) : null}
          </div>
          {report.editAccessRequested && report.editAccessRequestReason ? (
            <div className="mt-1 text-xs bg-card/90 border border-amber-300/40 rounded-lg p-2.5 text-textPrimary">
              <span className="font-semibold text-amber-800 dark:text-amber-300">{t("reports.reasonForRequest")} </span>
              <span className="italic">"{report.editAccessRequestReason}"</span>
            </div>
          ) : null}
        </div>
        {report.editAccessRequested && sessionUser?.role && ["admin", "ceo", "hod", "report_manager", "team_lead"].includes(sessionUser.role) && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-danger/30 text-danger hover:bg-danger/10" onClick={() => handleEditApproval(false)} disabled={isUpdatingEdit}>
              {t("reports.rejectEdit")}
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold" onClick={() => handleEditApproval(true)} disabled={isUpdatingEdit}>
              {t("reports.approveEdit")}
            </Button>
          </div>
        )}
      </div>
      <ReportSheetPreview title={t("reports.dailyTeamProgressReport")} dateLabel={dateLabel} teamGroups={singlePreviewGroups} />
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
