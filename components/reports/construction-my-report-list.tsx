"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDisplayName } from "@/lib/utils";
import { isReportDateToday } from "@/lib/report-edit-access";
import { useState, useEffect } from "react";
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

export function ConstructionMyReportList() {
  const { t } = useTranslation();
  const selectedCompanyId = useSelectedCompany();
  const [selectedDept, setSelectedDept] = useState<string>("all");

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
  const hideTeamAndType = isTm || isTl;
  const routePrefix = isTm ? "/tm/daily-report" : "/daily-report";

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

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-4 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">{t("reports.descMyReports")}</div>
          <Badge variant="soft">{reports.length} {t("nav.reports")}</Badge>
        </div>

        <div className="overflow-hidden rounded-xl border border-cardBorder">
          <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
            <div className={hideTeamAndType ? "col-span-5" : "col-span-2"}>{t("common.date")}</div>
            {!hideTeamAndType && <div className="col-span-2">{t("common.team")}</div>}
            {!hideTeamAndType && <div className="col-span-2">{t("common.role")}</div>}
            <div className="col-span-3">{t("reports.attachments")}</div>
            <div className={hideTeamAndType ? "col-span-4" : "col-span-3"}>{t("common.actions")}</div>
          </div>

          <div className="divide-y">
            {query.isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : query.isError ? (
              <div className="px-4 py-6 text-sm text-danger">{t("common.somethingWentWrong")}</div>
            ) : reports.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">{t("reports.noReportsSubmitted")}</div>
            ) : (
              reports.map((report, idx) => {
                const reportId = report._id || (report as any).id || `my-report-${idx}`;
                return (
                  <div key={reportId} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-12">
                    <div className={`text-muted-foreground ${hideTeamAndType ? "md:col-span-5" : "md:col-span-2"}`}>
                      <span className="mr-2 rtl:ml-2 rtl:mr-0 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("common.date")}</span>
                      {formatDate(report.updatedAt || report.createdAt || report.submittedAt || report.reportDate)}
                    </div>
                    {!hideTeamAndType && (
                      <div className="font-medium md:col-span-2">
                        <span className="mr-2 rtl:ml-2 rtl:mr-0 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">{t("common.team")}</span>
                        {formatDisplayName(report.teamName)}
                      </div>
                    )}
                    {!hideTeamAndType && (
                      <div className="text-muted-foreground md:col-span-2">
                        <span className="mr-2 rtl:ml-2 rtl:mr-0 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("common.role")}</span>
                        {report.reportType}
                      </div>
                    )}
                    <div className="md:col-span-3">
                      <span className="mr-2 rtl:ml-2 rtl:mr-0 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">{t("reports.attachments")}</span>
                      {report.attachmentLink ? (
                        <a
                          className="text-sm font-medium text-primary hover:text-primary/80"
                          href={report.attachmentLink}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {t("common.view")}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className={`flex flex-wrap gap-2 ${hideTeamAndType ? "md:col-span-4" : "md:col-span-3"}`}>
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link href={`${routePrefix}/${reportId}/preview` as any}>{t("common.preview")}</Link>
                      </Button>
                      {isReportDateToday(report.reportDate) && !report.isLocked ? (
                        report.canEdit ? (
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <Link href={`${routePrefix}/${reportId}` as any}>{t("common.edit")}</Link>
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
              placeholder={t("reports.requestEditReason")}
              className="mb-4 min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
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
              <Button
                onClick={submitEditRequest}
                disabled={isSubmittingEdit || !editReason.trim()}
              >
                {isSubmittingEdit ? t("common.submitting") : t("common.submit")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
