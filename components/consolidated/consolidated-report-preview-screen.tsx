"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ArrowLeft, FileText, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { useSession } from "@/hooks/use-session";

type ReportGroup = "operations" | "finance";

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

/** Fetches consolidated report data for a given group from the API. */
function useGroupReport(endpoint: string, date: string, group: ReportGroup) {
  return useQuery({
    queryKey: [endpoint, "detail", date, group],
    enabled: Boolean(date),
    queryFn: async () => {
      const response = await api.get(endpoint, { params: { date, group } });
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
}

const GROUP_CONFIG: Record<ReportGroup, { label: string; pdfLabel: string; emptyLabel: string; icon: React.ReactNode }> = {
  operations: {
    label: "Operations",
    pdfLabel: "Operations PDF",
    emptyLabel: "No operations team reports found for this date.",
    icon: <Building2 className="h-3.5 w-3.5" />
  },
  finance: {
    label: "Finance",
    pdfLabel: "Finance PDF",
    emptyLabel: "No finance team reports found for this date.",
    icon: <FileText className="h-3.5 w-3.5" />
  }
};

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
  const [activeGroup, setActiveGroup] = useState<ReportGroup>("operations");
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: sessionUser } = useSession();
  const canViewFinance = sessionUser?.role === "admin" || sessionUser?.role === "ceo" || sessionUser?.role === "hod";

  const opsQuery = useGroupReport(endpoint, date, "operations");
  const financeQuery = useGroupReport(endpoint, date, "finance");

  const activeQuery = activeGroup === "finance" ? financeQuery : opsQuery;
  const report = activeQuery.data;
  const previewGroups = report?.teamGroups ?? [];
  const dateLabel = date ? formatDateOnly(date) : "";
  const config = GROUP_CONFIG[activeGroup];

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(
        `/api/consolidated-reports/pdf?date=${encodeURIComponent(date)}&group=${activeGroup}`,
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        activeGroup === "finance"
          ? `finance-consolidated-${date}.pdf`
          : `operations-consolidated-${date}.pdf`;
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
              <Button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4" />
                {isDownloading ? "Downloading..." : config.pdfLabel}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Group switcher */}
        <CardContent className="px-0 pb-0">
          <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
            {(Object.entries(GROUP_CONFIG) as [ReportGroup, typeof GROUP_CONFIG[ReportGroup]][]).map(
              ([group, cfg]) => {
                // Hide the Finance tab for users who cannot view finance reports.
                if (group === "finance" && !canViewFinance) return null;
                const isActive = activeGroup === group;
                const groupQuery = group === "finance" ? financeQuery : opsQuery;
                const count = groupQuery.data?.reportCount;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setActiveGroup(group)}
                    className={[
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    ].join(" ")}
                  >
                    {cfg.icon}
                    {cfg.label}
                    {count !== undefined && (
                      <span
                        className={[
                          "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        ].join(" ")}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview body */}
      {activeQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">
          Loading {config.label.toLowerCase()} report preview...
        </div>
      ) : activeQuery.isError ? (
        <div className="text-sm text-danger">
          Failed to load {config.label.toLowerCase()} report preview.
        </div>
      ) : !report ? (
        <div className="text-sm text-muted-foreground">No report selected.</div>
      ) : previewGroups.length === 0 ? (
        <div className="text-sm text-muted-foreground">{config.emptyLabel}</div>
      ) : (
        <div ref={previewRef} className="pdf-export-root">
          <ReportSheetPreview
            title={`${config.label} Team Progress Report`}
            dateLabel={dateLabel}
            teamGroups={previewGroups}
            subtitle={`${report.reportCount} reports · ${previewGroups.length} teams`}
          />
        </div>
      )}
    </div>
  );
}
