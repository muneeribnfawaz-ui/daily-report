"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";

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
  const reportQuery = useQuery({
    queryKey: ["my-report-preview", reportId],
    queryFn: async () => {
      const response = await api.get(`/api/reports/${reportId}`);
      return response.data?.data as ReportPreviewItem;
    }
  });

  const report = reportQuery.data;

  if (reportQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading report preview...</div>;
  }

  if (reportQuery.isError || !report) {
    return <div className="text-sm text-danger">Failed to load report preview.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/daily-report/my-reports">Back</Link>
        </Button>
        {report.canEdit ? (
          <Button asChild>
            <Link href={`/daily-report/${report._id}`}>Edit Report</Link>
          </Button>
        ) : null}
      </div>
      <ReportSheetPreview
        title="My Daily Report Preview"
        dateLabel={getDateLabel(report.reportDate)}
        teamGroups={getTeamGroups(report)}
      />
    </div>
  );
}
