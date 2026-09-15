"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatDisplayName } from "@/lib/utils";

import { ReportReviewDialog } from "@/components/reports/report-review-dialog";
import { isReportDateToday } from "@/lib/report-edit-access";
import { useTranslation } from "@/lib/i18n";

type ReportItem = {
  _id: string;
  employeeId?: string;
  employeeRole?: string;
  name: string;
  teamName: string;
  reportType: string;
  reportDate: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "locked";
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  verificationLevel?: string;
  reportManagerStatus?: string | null;
  reportManagerReview?: string | null;
  reportManagerReviewedByName?: string | null;
  reportManagerReviewedAt?: string | null;
  isLocked: boolean;
  editAccessRequested?: boolean;
  editAccessGranted?: boolean;
  attachmentLink?: string;
};

export function getReviewEligibility(
  report: ReportItem,
  currentUserId?: string | null,
  currentUserRole?: string | null
): { allowed: boolean; label?: string } {
  if (!currentUserId || !currentUserRole) return { allowed: false };

  if (report.employeeId && String(report.employeeId) === String(currentUserId)) {
    return { allowed: false, label: "Self-Submitted" };
  }

  const role = currentUserRole.toLowerCase();
  const authorRole = (report.employeeRole || "team_member").toLowerCase();

  // Admin & CEO can verify any reports
  if (role === "admin" || role === "ceo") {
    if (report.verificationLevel === "ceo") {
      return { allowed: false, label: "Verified by CEO" };
    }
    return { allowed: true };
  }

  // Report Manager: All Reports is view-only (no Add Remark / Edit Remark actions)
  if (role === "report_manager") {
    return { allowed: false };
  }

  // TM to TL: Team Lead verifies Team Member reports
  if (role === "team_lead") {
    if (authorRole !== "team_member") {
      return { allowed: false, label: "Senior Review Required" };
    }
    if (report.verificationLevel) {
      return {
        allowed: false,
        label: report.verificationLevel === "tl" ? "Verified by TL" : `Verified (${report.verificationLevel.toUpperCase()})`
      };
    }
    return { allowed: true };
  }

  // TL to HOD: HOD verifies Team Lead reports
  if (role === "hod") {
    if (authorRole === "team_lead") {
      if (report.verificationLevel === "hod" || report.verificationLevel === "ceo") {
        return { allowed: false, label: "Verified by HOD" };
      }
      if (!isReportDateToday(report.reportDate)) {
        return { allowed: false };
      }
      return { allowed: true };
    }
    if (authorRole === "team_member") {
      if (report.verificationLevel === "tl" || report.verificationLevel === "hod" || report.verificationLevel === "ceo") {
        return { allowed: false, label: "Verified by TL" };
      }
      return { allowed: true, label: "Pending TL Approval" };
    }
    return { allowed: false, label: "Senior Review Required" };
  }

  return { allowed: false };
}

type ReportDateGroup = {
  date: string;
  reportCount: number;
  teamNames: string[];
  reports: ReportItem[];
};

type PaginatedReportResponse = {
  items: ReportDateGroup[];
  page: number;
  limit: number;
  totalDates: number;
  totalPages: number;
};



export function ReportDateList({
  endpoint,
  title,
  detailBaseHref,
  userRole,
  currentUserId,
  pageSize = 10
}: {
  endpoint: string;
  title: string;
  detailBaseHref?: Route;
  userRole?: string;
  currentUserId?: string | null;
  pageSize?: number;
}) {
  const { t, isRtl } = useTranslation();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("employee") ?? "");
  const [page, setPage] = useState(1);
  const [reviewingReport, setReviewingReport] = useState<ReportItem | null>(null);
  const [viewingManagerRemark, setViewingManagerRemark] = useState<ReportItem | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("all");

  useEffect(() => {
    const stored = localStorage.getItem("daily_report_selected_department");
    if (stored) setSelectedDept(stored);

    const handleDeptChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) setSelectedDept(customEvent.detail);
    };

    window.addEventListener("department-changed", handleDeptChange);
    return () => window.removeEventListener("department-changed", handleDeptChange);
  }, []);

  const query = useQuery({
    queryKey: [endpoint, search, page, pageSize, selectedDept],
    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: {
          view: "date-paginated",
          employee: search || undefined,
          team: selectedDept && selectedDept !== "all" ? selectedDept : undefined,
          page,
          limit: pageSize
        }
      });
      return response.data?.data as PaginatedReportResponse;
    }
  });

  const dateGroups = query.data?.items ?? [];
  const allReports = dateGroups.flatMap((group) => group.reports);
  const totalPages = query.data?.totalPages ?? 0;
  const totalDates = query.data?.totalDates ?? 0;
  const currentPage = query.data?.page ?? page;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const allowEdit = async (reportId: string) => {
    await api.patch(`/api/report-manager/reports/${reportId}/edit-access`);
    await query.refetch();
  };

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-5 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <div className="mb-1 text-sm font-medium text-foreground">{t("common.search")} {title}</div>
            <div className="relative">
              <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isRtl ? "right-3" : "left-3"}`} />
              <Input
                className={isRtl ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}
                placeholder={`${t("common.search")} ${title}...`}
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{totalDates} {t("common.date")}</Badge>
            <Badge variant="outline">
              {t("pagination.page", { current: currentPage || 1, total: totalPages || 1 })}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {query.isLoading ? (
            <div className="rounded-xl border border-cardBorder px-4 py-6 text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : query.isError ? (
            <div className="rounded-xl border border-cardBorder px-4 py-6 text-sm text-danger">{t("common.error")}</div>
          ) : allReports.length === 0 ? (
            <div className="rounded-xl border border-cardBorder px-4 py-6 text-sm text-muted-foreground">{t("reports.noReportsSubmitted")}</div>
          ) : (
            <Card className="overflow-hidden border border-cardBorder">
              <CardContent className="p-0">
                <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
                  <div className="col-span-3">{t("common.date")}</div>
                  <div className="col-span-2">{t("common.name")}</div>
                  <div className="col-span-2">{t("teamTypes.teamName")}</div>
                  <div className="col-span-3">{t("reports.reviewStatus")}</div>
                  <div className="col-span-2">{t("common.actions")}</div>
                </div>
                <div className="divide-y">
                  {allReports.map((report) => (
                    <div key={report._id} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-12">
                      <div className="text-muted-foreground md:col-span-3">
                        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("common.date")}</span>
                        {formatDate(report.updatedAt || report.createdAt || report.submittedAt || report.reportDate)}
                      </div>
                      <div className="font-medium text-foreground md:col-span-2">
                        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("common.name")}</span>
                        {report.name || "N/A"}
                      </div>
                      <div className="text-muted-foreground md:col-span-2">
                        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("teamTypes.teamName")}</span>
                        {report.teamName && report.teamName !== "-" ? formatDisplayName(report.teamName) : "-"}
                      </div>
                      <div className="space-y-1.5 md:col-span-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={
                              report.status === "approved"
                                ? "soft"
                                : report.status === "rejected"
                                  ? "outline"
                                  : "default"
                            }
                          >
                            {report.status === "approved" ? t("reports.approved") : report.status === "rejected" ? t("reports.rejected") : report.status === "submitted" ? t("reports.pending") : formatDisplayName(report.status)}
                          </Badge>
                          {report.verificationLevel && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {report.verificationLevel === "tl" ? t("reports.verifiedByTl") : report.verificationLevel === "hod" ? t("reports.verifiedByHod") : `${formatDisplayName(report.verificationLevel)} Verified`}
                            </Badge>
                          )}
                        </div>

                        {(() => {
                          const authorRole = (report.employeeRole || "").toLowerCase();
                          const isTeamLead = authorRole === "team_lead";
                          const isSelf = Boolean(report.employeeId && currentUserId && String(report.employeeId) === String(currentUserId));
                          const hasManagerReview = Boolean(
                            report.reportManagerStatus || report.reportManagerReview || report.reportManagerReviewedByName
                          );

                          const shouldShowButton =
                            (userRole === "hod" && isTeamLead && !isSelf) ||
                            ((userRole === "admin" || userRole === "ceo") && isTeamLead && hasManagerReview);

                          if (!shouldShowButton) return null;

                          return (
                            <div className="pt-0.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[11px] font-medium border-primary/40 bg-primary/5 text-primary hover:bg-primary/15"
                                onClick={() => setViewingManagerRemark(report)}
                              >
                                {t("reports.rmRemark")}
                              </Button>
                            </div>
                          );
                        })()}

                        {report.reviewedByName && (
                          <div className="text-xs text-muted-foreground">
                            {t("reports.reviewStatus")}: <span className="font-semibold text-textPrimary">{report.reviewedByName}</span>
                            {report.reviewNotes && <p className="italic text-muted-foreground/80">"{report.reviewNotes}"</p>}
                          </div>
                        )}

                        {report.editAccessRequested || report.editAccessGranted ? (
                          <div className="flex flex-wrap gap-1.5">
                            {report.editAccessRequested ? <Badge variant="outline">{t("reports.editAccessRequested")}</Badge> : null}
                            {report.editAccessGranted ? <Badge variant="soft">{t("reports.editAccessGranted")}</Badge> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-start gap-1.5 md:col-span-2">
                        {(() => {
                          const eligibility = getReviewEligibility(report, currentUserId, userRole);
                          if (eligibility.allowed) {
                            return (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs font-semibold"
                                onClick={() => setReviewingReport(report)}
                              >
                                {userRole === "report_manager" ? eligibility.label || t("common.add") : t("reports.reviewReport")}
                              </Button>
                            );
                          }
                          if (eligibility.label && userRole !== "report_manager") {
                            return (
                              <span className="text-xs font-medium italic text-muted-foreground">
                                {eligibility.label}
                              </span>
                            );
                          }
                          return null;
                        })()}

                        {report.editAccessRequested && !report.editAccessGranted && !report.isLocked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 border-amber-200 bg-amber-50 px-2.5 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                            onClick={() => allowEdit(report._id)}
                          >
                            {t("reports.approveEdit")}
                          </Button>
                        ) : null}

                        {detailBaseHref ? (
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            <Link href={`${detailBaseHref}/${report._id}` as Route}>{t("reports.viewReport")}</Link>
                          </Button>
                        ) : report.attachmentLink ? (
                          <a
                            className="text-xs font-medium text-primary hover:text-primary/80"
                            href={report.attachmentLink}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {t("reports.attachments")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1 || query.isLoading}>
            {t("pagination.previous")}
          </Button>
          <div className="text-sm text-muted-foreground">
            {t("pagination.page", { current: currentPage || 1, total: totalPages || 1 })}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={totalPages === 0 || currentPage >= totalPages || query.isLoading}
          >
            {t("pagination.next")}
          </Button>
        </div>

        {reviewingReport && (
          <ReportReviewDialog
            reportId={reviewingReport._id}
            employeeName={reviewingReport.name}
            teamName={reviewingReport.teamName}
            reportDate={reviewingReport.reportDate}
            status={reviewingReport.status}
            existingReviewNotes={reviewingReport.reviewNotes || ""}
            existingRejectionReason={reviewingReport.rejectionReason || ""}
            reviewerName={reviewingReport.reviewedByName}
            existingReportManagerStatus={reviewingReport.reportManagerStatus || ""}
            existingReportManagerReview={reviewingReport.reportManagerReview || ""}
            existingReportManagerReviewedByName={reviewingReport.reportManagerReviewedByName || ""}
            userRole={userRole || "manager"}
            onSuccess={() => query.refetch()}
            onClose={() => setReviewingReport(null)}
          />
        )}

        {viewingManagerRemark && (() => {
          const hasManagerReview = Boolean(
            viewingManagerRemark.reportManagerStatus ||
            viewingManagerRemark.reportManagerReview ||
            viewingManagerRemark.reportManagerReviewedByName
          );
          const isApproved = viewingManagerRemark.reportManagerStatus === "approved";
          const isRejected = viewingManagerRemark.reportManagerStatus === "rejected";

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-card-foreground">{t("reports.rmRemark")}</h2>
                    <p className="text-xs text-muted-foreground">
                      {t("roles.teamLead")}: {viewingManagerRemark.name} · {formatDisplayName(viewingManagerRemark.teamName)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewingManagerRemark(null)}>
                    ✕
                  </Button>
                </div>

                {hasManagerReview ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                      <div>
                        <span className="text-xs text-muted-foreground">{t("auditLogs.performedBy")}</span>
                        <p className="font-semibold text-foreground">
                          {viewingManagerRemark.reportManagerReviewedByName || t("roles.reportManager")}
                        </p>
                      </div>
                      <div>
                        <Badge
                          variant={isApproved ? "soft" : "outline"}
                          className={
                            isApproved
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold"
                              : isRejected
                                ? "border-rose-200 bg-rose-50 text-rose-800 font-semibold"
                                : "font-semibold"
                          }
                        >
                          {isApproved ? t("reports.approved") : isRejected ? t("reports.rejected") : formatDisplayName(viewingManagerRemark.reportManagerStatus ?? "")}
                        </Badge>
                      </div>
                    </div>

                    {viewingManagerRemark.reportManagerReviewedAt && (
                      <div className="text-xs text-muted-foreground">
                        {t("auditLogs.timestamp")}:{" "}
                        <span className="font-medium text-foreground">
                          {new Date(viewingManagerRemark.reportManagerReviewedAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-textPrimary">
                        {isRejected ? t("reports.rejected") : t("reports.remark")}
                      </label>
                      <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                        {viewingManagerRemark.reportManagerReview || t("finance.noDescription")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                      <div>
                        <span className="text-xs text-muted-foreground">{t("common.status")}</span>
                        <p className="font-semibold text-foreground">{t("reports.notVerified")}</p>
                      </div>
                      <div>
                        <Badge variant="outline" className="border-muted-foreground/30 bg-muted/20 text-muted-foreground font-semibold">
                          {t("reports.notVerified")}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-textPrimary">
                        {t("reports.remark")}
                      </label>
                      <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground italic">
                        {t("reports.notVerified")}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => setViewingManagerRemark(null)}>
                    {t("common.close")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
