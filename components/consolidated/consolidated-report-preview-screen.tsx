"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, ArrowLeft, FileText, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportSheetPreview, type ReportSheetEntry, type ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";

type ReportGroup = "operations";

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
function useGroupReport(endpoint: string, date: string, group: ReportGroup, department?: string, workspaceId?: string) {
  return useQuery({
    queryKey: [endpoint, "detail", date, group, department, workspaceId],
    enabled: Boolean(date),
    queryFn: async () => {
      const response = await api.get(endpoint, { 
        params: { 
          date, 
          group, 
          department: department && department !== "All" ? department : undefined,
          ...(workspaceId ? { workspaceId } : {})
        } 
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
}

const GROUP_CONFIG: Record<ReportGroup, { label: string; pdfLabel: string; emptyLabel: string; icon: React.ReactNode }> = {
  operations: {
    label: "Operations",
    pdfLabel: "Operations PDF",
    emptyLabel: "No operations team reports found for this date.",
    icon: <Building2 className="h-3.5 w-3.5" />
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
  const [activeGroup] = useState<ReportGroup>("operations");
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_company");
      if (stored) setSelectedCompanyId(stored);

      const handleCompanyChange = (e: any) => {
        setSelectedCompanyId(e.detail);
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }
  }, []);

  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? "All";

  const activeQuery = useGroupReport(endpoint, date, "operations", department, selectedCompanyId);
  const report = activeQuery.data;
  const previewGroups = report?.teamGroups ?? [];
  const dateLabel = date ? formatDateOnly(date) : "";
  const config = GROUP_CONFIG.operations;
  
  const displayDepartment = department !== "All" ? department : "Operations";
  const pdfFilename = `${displayDepartment.toLowerCase()}-consolidated-${date}.pdf`;

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      
      const queryParams = new URLSearchParams({
        date,
        group: "operations"
      });
      if (department !== "All") {
        queryParams.set("department", department);
      }
      if (selectedCompanyId) {
        queryParams.set("workspaceId", selectedCompanyId);
      }

      const response = await fetch(
        `/api/consolidated-reports/pdf?${queryParams.toString()}`,
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = pdfFilename;
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
      {/* Header Info Card */}
      <div className="rounded-xl border border-cardBorder bg-card p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon" className="shrink-0">
              <Link href={backHref as Route} title="Back to list" aria-label="Back to list">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                Preview for {dateLabel}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading..." : config.pdfLabel}
            </Button>
          </div>
        </div>
      </div>

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
            title={`${displayDepartment} Team Progress Report`}
            dateLabel={dateLabel}
            teamGroups={previewGroups}
            subtitle={`${report.reportCount} reports · ${previewGroups.length} teams`}
          />
        </div>
      )}
    </div>
  );
}
