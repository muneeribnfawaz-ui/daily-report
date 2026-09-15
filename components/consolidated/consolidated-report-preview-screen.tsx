"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ArrowLeft, Building2, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ReportSheetPreview,
  type ReportSheetEntry,
  type ReportSheetTeamGroup,
  type DepartmentSection
} from "@/components/reports/report-sheet-preview";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { DEPARTMENT_OPTIONS } from "@/lib/constants";
import { formatDisplayName } from "@/lib/utils";

type ReportGroup = "operations";

type ConsolidatedDayReport = {
  date: string;
  reportCount: number;
  teamCount: number;
  teamGroups: ReportSheetTeamGroup[];
  departmentSections?: DepartmentSection[];
};

type ReportListItem = ReportSheetEntry & {
  employeeId?: string;
};

function formatPeriodDate(value: string | Date, period: "daily" | "weekly" | "monthly") {
  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalizedValue);
  
  if (period === "monthly") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (period === "weekly") {
    return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

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
function useGroupReport(
  endpoint: string,
  date: string,
  group: ReportGroup,
  department?: string,
  workspaceId?: string,
  period?: string,
  team?: string,
  mine?: boolean
) {
  return useQuery({
    queryKey: [endpoint, "detail", date, group, department, workspaceId, period, team, mine],
    enabled: Boolean(date),
    queryFn: async () => {
      const response = await api.get(endpoint, { 
        params: { 
          date, 
          group,
          period,
          department: department || "All",
          team: team && team !== "All" ? team : undefined,
          mine: mine ? "true" : undefined,
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

export function ConsolidatedReportPreviewScreen({
  endpoint,
  date,
  period,
  backHref,
  title
}: {
  endpoint: string;
  date: string;
  period?: string;
  backHref: string;
  title: string;
}) {
  const { t, isRtl } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: sessionUser } = useSession();

  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const department = searchParams.get("department") ?? "All";
  const team = searchParams.get("team") ?? "All";
  const mine = searchParams.get("mine") === "true";

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

  // Compute available departments for the user
  const availableDepartments = useMemo<string[]>(() => {
    if (sessionUser?.departments && sessionUser.departments.length > 0) {
      return Array.from(
        new Set(
          sessionUser.departments
            .map((d: any) => (typeof d === "string" ? d : d?.name || String(d)))
            .filter(Boolean)
        )
      );
    }
    if (sessionUser?.role === "hod") {
      return [...DEPARTMENT_OPTIONS];
    }
    return [...DEPARTMENT_OPTIONS];
  }, [sessionUser]);

  const activeQuery = useGroupReport(endpoint, date, "operations", department, selectedCompanyId, period, team, mine);
  const report = activeQuery.data;
  const previewGroups = report?.teamGroups ?? [];
  const departmentSections = report?.departmentSections ?? [];

  const dateLabel = date ? formatPeriodDate(date, period as "daily" | "weekly" | "monthly") : "";
  
  const isAllDept = !department || department === "All" || department.toLowerCase() === "all" || department.toLowerCase() === "all enrolled depts" || department.toLowerCase() === "all departments";
  const displayDepartment = !isAllDept ? department : "Operations";
  const mainReportTitle = isAllDept ? "All Departments Daily Report" : `${formatDisplayName(department)} Daily Report`;
  const pdfFilename = `${(isAllDept ? "all-departments" : displayDepartment).toLowerCase()}-consolidated-${date}.pdf`;

  const handleDepartmentChange = (newDept: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (!newDept || newDept === "All") {
      nextParams.set("department", "All");
    } else {
      nextParams.set("department", newDept);
    }
    localStorage.setItem("daily_report_selected_department", newDept);
    window.dispatchEvent(new CustomEvent("department-changed", { detail: newDept }));
    queryClient.invalidateQueries();
    router.replace(`${pathname}?${nextParams.toString()}` as Route);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      
      const queryParams = new URLSearchParams({
        date,
        group: "operations",
        period: period ?? "daily"
      });
      if (department !== "All") {
        queryParams.set("department", department);
      }
      if (team !== "All") {
        queryParams.set("team", team);
      }
      if (mine) {
        queryParams.set("mine", "true");
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
      window.alert(t("common.error"));
    } finally {
      setIsDownloading(false);
    }
  };

  const hasData = departmentSections.length > 0 || previewGroups.length > 0;

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <div className="rounded-xl border border-cardBorder bg-card p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon" className="shrink-0">
              <Link href={backHref as Route} title={t("common.back")} aria-label={t("common.back")}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("consolidated.previewFor", { date: dateLabel })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Department Selector */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                id="department-selector"
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Filter by department"
              >
                <option value="All">{t("common.allDepartments")}</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {formatDisplayName(dept)}
                  </option>
                ))}
              </select>
            </div>

            {/* PDF Export Button */}
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
            >
              <Download className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isDownloading ? t("common.loading") : "PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview body */}
      {activeQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : activeQuery.isError ? (
        <div className="text-sm text-danger">
          {t("common.error")}
        </div>
      ) : !report || !hasData ? (
        <div className="text-sm text-muted-foreground">{t("consolidated.noDataForRange")}</div>
      ) : (
        <div ref={previewRef} className="pdf-export-root">
          <ReportSheetPreview
            title={mainReportTitle}
            dateLabel={dateLabel}
            teamGroups={previewGroups}
            departmentSections={departmentSections}
            subtitle={`${report.reportCount} ${t("nav.reports")} · ${report.teamCount} ${t("roles.team")}`}
          />
        </div>
      )}
    </div>
  );
}
