"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDisplayName } from "@/lib/utils";
import { isReportDateToday } from "@/lib/report-edit-access";
import { useState, useMemo, useEffect } from "react";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useTranslation } from "@/lib/i18n";

type ReportItem = {
  _id: string;
  name: string;
  teamName: string;
  reportType: string;
  reportDate: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  attachmentLink?: string;
  isLocked: boolean;
  canEdit: boolean;
  editAccessRequested?: boolean;
};

export function MyReportList({ showHeader }: { showHeader?: boolean }) {
  const { t, isRtl } = useTranslation();
  const router = useRouter();
  const selectedCompanyId = useSelectedCompany();
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [alreadySubmittedModalOpen, setAlreadySubmittedModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_department");
      if (stored) setSelectedDept(stored);

      const handleDeptChange = (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        if (customEvent.detail) setSelectedDept(customEvent.detail);
      };
      window.addEventListener("department-changed", handleDeptChange);
      return () => window.removeEventListener("department-changed", handleDeptChange);
    }
  }, []);

  const query = useQuery({
    queryKey: ["my-reports", selectedCompanyId, selectedDept],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== "all") {
        queryParams.set("workspaceId", selectedCompanyId);
      }
      if (selectedDept && selectedDept !== "all" && selectedDept !== "All") {
        queryParams.set("team", selectedDept);
      }
      const url = `/api/reports/my?${queryParams.toString()}`;
      const response = await api.get(url);
      return response.data?.data as ReportItem[];
    }
  });

  const reports = query.data ?? [];

  const { data: sessionUser } = useQuery<any>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data;
    },
    staleTime: 60_000
  });
  const [editRequestModalOpen, setEditRequestModalOpen] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const isTm = sessionUser?.role === "team_member";
  const isTl = sessionUser?.role === "team_lead";
  const isHod = sessionUser?.role === "hod";
  const isRm = sessionUser?.role === "report_manager";
  const hideTeamAndType = isTm || isTl || isRm;
  const routePrefix = isTm ? "/tm/daily-report" : "/daily-report";

  let displayReports: any[] = reports;

  if (isHod) {
    const grouped = new Map<string, any>();
    for (const report of reports) {
      const dateObj = new Date(report.reportDate);
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(dateObj);

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          ...report,
          _dateKey: dateKey,
          teamName: report.teamName,
          displayDate: (report as any).updatedAt || (report as any).createdAt || report.reportDate,
        });
      } else {
        const existing = grouped.get(dateKey);
        existing.teamName = `${existing.teamName}, ${report.teamName}`;
        
        const existingTime = new Date(existing.displayDate).getTime();
        const newTime = new Date((report as any).updatedAt || (report as any).createdAt || report.reportDate).getTime();
        if (newTime > existingTime) {
          existing.displayDate = (report as any).updatedAt || (report as any).createdAt || report.reportDate;
        }
        
        if (!existing.attachmentLink && report.attachmentLink) {
          existing.attachmentLink = report.attachmentLink;
        }
      }
    }
    displayReports = Array.from(grouped.values());
  }

  const submitEditRequest = async () => {
    if (!editRequestModalOpen || !editReason.trim()) return;
    setIsSubmittingEdit(true);
    try {
      await api.post(`/api/reports/${editRequestModalOpen}/edit-request`, { reason: editReason });
      await query.refetch();
    } finally {
      setIsSubmittingEdit(false);
      setEditRequestModalOpen(null);
      setEditReason("");
    }
  };

  const todayDateKey = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }, []);

  const todayReport = useMemo(() => {
    if (!reports || reports.length === 0) return null;
    return reports.find((r) => {
      const reportDateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(r.reportDate));

      const teamMatches = selectedDept && selectedDept !== "all" && selectedDept !== "All"
        ? r.teamName === selectedDept
        : true;

      return reportDateKey === todayDateKey && teamMatches;
    }) ?? null;
  }, [reports, selectedDept, todayDateKey]);

  const handleCreateReportClick = () => {
    if (isTm && todayReport && !todayReport.canEdit) {
      setAlreadySubmittedModalOpen(true);
      return;
    }
    if (isTl && todayReport) {
      setAlreadySubmittedModalOpen(true);
      return;
    }
    router.push(routePrefix === "/tm/daily-report" ? "/tm/daily-report" : "/daily-report/create");
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              {t("reports.titleMyReports")}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("reports.descMyReports")}
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={handleCreateReportClick}>
            {t("reports.createReport")}
          </Button>
        </div>
      )}

      <Card className="border-none shadow-none">
        <CardContent className="space-y-4 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">{t("reports.descMyReports")}</div>
            <Badge variant="soft">{reports.length} {t("nav.reports")}</Badge>
          </div>

          <div className="overflow-hidden rounded-xl border border-cardBorder">
            <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
              <div className={hideTeamAndType ? "col-span-5" : isHod ? "col-span-3" : "col-span-2"}>{t("reports.reportDate")}</div>
              {!hideTeamAndType && <div className={isHod ? "col-span-3" : "col-span-2"}>{t("teamTypes.teamName")}</div>}
              {!hideTeamAndType && !isHod && <div className="col-span-2">{t("common.status")}</div>}
              <div className="col-span-3">{t("reports.attachments")}</div>
              <div className={hideTeamAndType ? "col-span-4" : "col-span-3"}>{t("common.actions")}</div>
            </div>

            <div className="divide-y">
              {query.isLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">{t("common.loading")}</div>
              ) : query.isError ? (
                <div className="px-4 py-6 text-sm text-danger">{t("common.error")}</div>
              ) : displayReports.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">{t("reports.noReportsSubmitted")}</div>
              ) : (
                displayReports.map((report, idx) => {
                  const reportId = report._id || (report as any).id || `my-report-${idx}`;
                  return (
                    <div key={reportId} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-12">
                      <div className={`text-muted-foreground ${hideTeamAndType ? "md:col-span-5" : isHod ? "md:col-span-3" : "md:col-span-2"}`}>
                        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("reports.reportDate")}</span>
                        {formatDate(report.displayDate || report.updatedAt || report.createdAt || report.submittedAt || report.reportDate)}
                      </div>
                      {!hideTeamAndType && (
                        <div className={`font-medium ${isHod ? "md:col-span-3" : "md:col-span-2"}`}>
                          <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">{t("teamTypes.teamName")}</span>
                          {isHod ? report.teamName : formatDisplayName(report.teamName)}
                        </div>
                      )}
                      {!hideTeamAndType && !isHod && (
                        <div className="text-muted-foreground md:col-span-2">
                          <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("common.status")}</span>
                          {report.reportType}
                        </div>
                      )}
                      <div className="md:col-span-3">
                        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">{t("reports.attachments")}</span>
                        {report.attachmentLink ? (
                            <Button asChild size="sm" variant="link" className="h-auto p-0 font-medium">
                              <a
                                href={report.attachmentLink}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {t("common.view")}
                              </a>
                            </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className={`flex flex-wrap gap-2 ${hideTeamAndType ? "md:col-span-4" : "md:col-span-3"}`}>
                        <Button asChild size="sm" variant="outline" className="h-8">
                          {isHod ? (
                            <Link href={`/daily-report/preview-hod?date=${report._dateKey}`}>{t("common.view")}</Link>
                          ) : (
                            <Link href={`${routePrefix}/${reportId}/preview` as any}>{t("common.view")}</Link>
                          )}
                        </Button>
                        {isReportDateToday(report.reportDate) && !report.isLocked ? (
                          report.canEdit ? (
                            <Button asChild size="sm" variant="outline" className="h-8">
                              {isHod ? (
                                <Link href={`/daily-report/edit-hod?date=${report._dateKey}`}>{t("common.edit")}</Link>
                              ) : (
                                <Link href={`${routePrefix}/${reportId}` as any}>{t("common.edit")}</Link>
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={Boolean(report.editAccessRequested)}
                              onClick={() => setEditRequestModalOpen(reportId)}
                            >
                              {report.editAccessRequested ? t("reports.editAccessRequested") : t("reports.requestEdit")}
                            </Button>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pb-2 dark:pb-0">
            <Button variant="outline" onClick={() => query.refetch()}>
              {t("common.refresh")}
            </Button>
          </div>
        </CardContent>

        {editRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-semibold">{t("reports.requestEdit")}</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("reports.requestEditReason")}
              </p>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder={`${t("reports.requestEditReason")}...`}
                className="mb-4 min-h-[100px]"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditRequestModalOpen(null);
                    setEditReason("");
                  }}
                  disabled={isSubmittingEdit}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={submitEditRequest} disabled={!editReason.trim() || isSubmittingEdit}>
                  {isSubmittingEdit ? t("common.submitting") : t("common.submit")}
                </Button>
              </div>
            </div>
          </div>
        )}

      {alreadySubmittedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">{t("reports.noReportToday")}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isTl
                ? "You’ve already submitted today’s report. To make changes, please use the Edit option."
                : "You’ve already submitted today’s report. To make changes, please request edit access."}
            </p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setAlreadySubmittedModalOpen(false)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
      </Card>
    </div>
  );
}
