"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";

type ConsolidatedDayReport = {
  date: string;
  reportCount: number;
  teamCount: number;
  teamGroups: ReportSheetTeamGroup[];
};

type ReportListItem = ReportSheetEntry & {
  employeeId?: string;
};

function formatDateOnly(value: string | Date) {
  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalizedValue);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function groupReportsByTeam(reports: ReportListItem[]): ReportSheetTeamGroup[] {
  const groups = new Map<string, ReportListItem[]>();

  for (const report of reports) {
    const current = groups.get(report.teamName) ?? [];
    current.push(report);
    groups.set(report.teamName, current);
  }

  return Array.from(groups.entries()).map(([teamName, teamReports]) => ({
    teamName,
    dailyMeetingUpdate: teamReports
      .map((item) => item.dailyMeetingUpdate?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n"),
    reports: teamReports
      .slice()
      .sort((a, b) => {
        const aLead = a.employeeRole === "team_lead" ? 0 : 1;
        const bLead = b.employeeRole === "team_lead" ? 0 : 1;
        return aLead - bLead || a.name.localeCompare(b.name);
      })
  }));
}

export function ConsolidatedReportPreviewScreen({
  endpoint,
  date,
  backHref,
  title
}: {
  endpoint: string;
  date: string;
  backHref: string;
  title: string;
}) {
  const reportQuery = useQuery({
    queryKey: [endpoint, "detail", date],
    enabled: Boolean(date),
    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: { date }
      });
      const payload = response.data?.data as ConsolidatedDayReport | ReportListItem[] | undefined;
      if (!payload) return null;

      if (Array.isArray(payload)) {
        const teamGroups = groupReportsByTeam(payload);
        return {
          date,
          reportCount: payload.length,
          teamCount: teamGroups.length,
          teamGroups
        } as ConsolidatedDayReport;
      }

      return payload;
    }
  });

  const report = reportQuery.data;
  const previewGroups = report?.teamGroups ?? [];
  const dateLabel = date ? formatDateOnly(date) : "";
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/consolidated-reports/pdf?date=${encodeURIComponent(date)}`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `consolidated-report-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.alert("Unable to download PDF right now.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">
                Preview for {dateLabel}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href={backHref as Route}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to list
                </Link>
              </Button>
              <Button type="button" onClick={handleDownloadPdf} disabled={isDownloading}>
                <Download className="h-4 w-4" />
                {isDownloading ? "Downloading..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            This screen shows the reusable full report preview only. The dated list stays on the previous screen.
          </div>
        </CardContent>
      </Card>

      {reportQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading consolidated report preview...</div>
      ) : reportQuery.isError ? (
        <div className="text-sm text-danger">Failed to load consolidated report preview.</div>
      ) : !report ? (
        <div className="text-sm text-muted-foreground">No report selected.</div>
      ) : previewGroups.length === 0 ? (
        <div className="text-sm text-muted-foreground">No daily reports found for {dateLabel}.</div>
      ) : (
        <div ref={previewRef} className="pdf-export-root">
          <ReportSheetPreview
            title="Daily Team Progress Report"
            dateLabel={dateLabel}
            teamGroups={previewGroups}
            subtitle={`${report.reportCount} reports · ${previewGroups.length} teams`}
          />
        </div>
      )}
    </div>
  );
}
