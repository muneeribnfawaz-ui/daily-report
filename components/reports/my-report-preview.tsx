"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { isInMarketing, isInConstruction } from "@/lib/permissions";
import { useTranslation } from "@/lib/i18n";

type ReportPreviewItem = ReportSheetEntry & {
  status?: string;
  isLocked?: boolean;
  canEdit?: boolean;
};

function getDateLabel(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function getTeamGroups(report: ReportPreviewItem): ReportSheetTeamGroup[] {
  return [
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
  ];
}

export function MyReportPreview({ reportId }: { reportId: string }) {
  const { t } = useTranslation();
  const reportQuery = useQuery({
    queryKey: ["my-report-preview", reportId],
    queryFn: async () => {
      const response = await api.get(`/api/reports/${reportId}`);
      return response.data?.data as ReportPreviewItem;
    }
  });

  const report = reportQuery.data;
  const { data: sessionUser } = useQuery<any>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data;
    }
  });
  const isTm = sessionUser?.role === "team_member";
  const isMarketing = isInMarketing(sessionUser);
  const isConstruction = isInConstruction(sessionUser);

  const myReportsHref = isTm ? "/tm/my-reports" : "/daily-report/my-reports";
  let editReportPrefix = isTm ? "/tm/daily-report" : "/daily-report";
  
  if (isMarketing) {
    editReportPrefix = "/marketing";
  } else if (isConstruction) {
    editReportPrefix = "/construction";
  }

  if (reportQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("reports.loadingReportDetails")}</div>;
  }

  if (reportQuery.isError || !report) {
    return <div className="text-sm text-danger">{t("reports.failedToLoadReport")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
          <Link href={myReportsHref as any} title={t("common.back")} aria-label={t("common.back")}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
        {report.canEdit ? (
          <Button asChild>
            <Link href={`${editReportPrefix}/${report._id}` as any}>{t("reports.editReport")}</Link>
          </Button>
        ) : null}
      </div>
      <ReportSheetPreview
        title={t("reports.myDailyReportPreview")}
        dateLabel={getDateLabel(report.reportDate)}
        teamGroups={getTeamGroups(report)}
      />
    </div>
  );
}
