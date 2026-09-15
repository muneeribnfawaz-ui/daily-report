"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDisplayName } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText, UserCheck, ExternalLink } from "lucide-react";
import { ConstructionReportPreview } from "@/components/reports/construction-report-preview";
import { MarketingReportPreview } from "@/components/reports/marketing-report-preview";
import type { SessionUser } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

type TeamLeadTodayItem = {
  id: string;
  name: string;
  teamName: string;
  department: string;
  todayReport: {
    id: string;
    reportDate: string;
    completedWork: string;
    pendingWork: string;
    blockers: string;
    requiredClarification: string;
    attachmentLink?: string | null;
    dailyMeetingUpdate?: string | null;
    status: string;
    reportManagerStatus?: "approved" | "rejected" | null;
    reportManagerReview?: string | null;
    reportManagerReviewedByName?: string | null;
    reportManagerReviewedAt?: string | null;
    constructionWorkPlan?: Array<{
      activity?: string;
      location?: string;
      unit?: string;
      plannedQuantity?: string;
      executedQuantity?: string;
      completionPercentage?: string;
      remarks?: string;
    }>;
    constructionMaterialUtilization?: Array<{
      material?: string;
      unit?: string;
      openingStock?: string;
      received?: string;
      closingStock?: string;
    }>;
    constructionTomorrowWorkPlan?: Array<{
      activity?: string;
      location?: string;
      unit?: string;
      plannedQuantity?: string;
    }>;
    marketingSelfItems?: any[];
    marketingClientItems?: any[];
    nextDayApprovalItems?: Array<{
      particulars: string;
      amountINR: number;
      amountRiyal: number;
      reason?: string;
      review?: string;
      approval?: string;
    }>;
  } | null;
};

export function ReportManagerDailyReportForm() {
  const { t, isRtl } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [remarkErrors, setRemarkErrors] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, "approve" | "reject" | null>>({});
  const [actionSuccess, setActionSuccess] = useState<Record<string, string>>({});
  const [additionalRemarks, setAdditionalRemarks] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await api.get("/api/auth/me");
      return res.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  const { data: teamLeads = [], isLoading, refetch } = useQuery<TeamLeadTodayItem[]>({
    queryKey: ["report-manager-team-leads-today"],
    queryFn: async () => {
      const res = await api.get("/api/report-manager/team-leads-today");
      return res.data?.data || [];
    }
  });

  // Query today's existing report manager submission if any
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data: myTodayReports } = useQuery({
    queryKey: ["my-reports-today", todayDateStr],
    queryFn: async () => {
      const res = await api.get(`/api/reports/my?date=${todayDateStr}`);
      return res.data?.data || [];
    }
  });

  // Pre-fill existing remarks for each team lead
  useEffect(() => {
    if (teamLeads.length > 0) {
      setRemarks((prev) => {
        const next = { ...prev };
        for (const tl of teamLeads) {
          if (tl.todayReport?.reportManagerReview && next[tl.id] === undefined) {
            next[tl.id] = tl.todayReport.reportManagerReview;
          }
        }
        return next;
      });
    }
  }, [teamLeads]);

  // Pre-fill Report Manager's own existing additional remarks if submitted today
  useEffect(() => {
    if (myTodayReports && myTodayReports.length > 0 && !additionalRemarks) {
      const first = myTodayReports[0];
      if (first.completedWork) {
        setAdditionalRemarks(first.completedWork);
      }
    }
  }, [myTodayReports, additionalRemarks]);

  const handleRemarkChange = (tlId: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [tlId]: value }));
    if (remarkErrors[tlId]) {
      setRemarkErrors((prev) => {
        const next = { ...prev };
        delete next[tlId];
        return next;
      });
    }
  };

  const handleReviewAction = async (tl: TeamLeadTodayItem, action: "approve" | "reject") => {
    if (!tl.todayReport) return;
    const reportId = tl.todayReport.id;
    const currentRemark = (remarks[tl.id] || "").trim();

    if (!currentRemark) {
      setRemarkErrors((prev) => ({
        ...prev,
        [tl.id]: action === "approve" ? t("validation.remarkRequired") : t("validation.reasonRequired")
      }));
      return;
    }

    setActionLoading((prev) => ({ ...prev, [tl.id]: action }));
    setRemarkErrors((prev) => {
      const next = { ...prev };
      delete next[tl.id];
      return next;
    });

    try {
      await api.post(`/api/reports/${reportId}/approve`, {
        action,
        reviewNotes: action === "approve" ? currentRemark : "",
        rejectionReason: action === "reject" ? currentRemark : ""
      });

      setActionSuccess((prev) => ({
        ...prev,
        [tl.id]: action === "approve" ? t("reports.reviewSubmitted") : t("reports.reviewSubmitted")
      }));

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t("common.error");
      setRemarkErrors((prev) => ({ ...prev, [tl.id]: msg }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [tl.id]: null }));
    }
  };

  const handleSubmitManagerReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmittingReport(true);

    try {
      const workspaceId = currentUser?.workspaceId;
      if (!workspaceId) {
        throw new Error("Missing workspace context");
      }

      const userDepartments = currentUser?.departments || [];
      const primaryDept = (typeof userDepartments[0] === "string"
        ? userDepartments[0]
        : userDepartments[0]?.name) || "General";

      const payload = {
        workspaceId,
        teamName: primaryDept,
        reportType: "Daily Update",
        reportDate: todayDateStr,
        completedWork: additionalRemarks.trim() || "Daily Report Manager Summary Submitted",
        pendingWork: "",
        blockers: "",
        requiredClarification: "",
        attachmentLink: ""
      };

      await api.post("/api/reports", payload);

      queryClient.invalidateQueries({ queryKey: ["my-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/daily-report/my-reports");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || t("common.error");
      setFormError(msg);
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold uppercase">
              {t("reports.rmRemark")}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {t("reports.reportDate")}: {formatDate(todayDateStr)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("reports.descAllReports")}
          </p>
        </div>
      </div>

      {formError && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Team Leads Cards List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            {t("roles.teamLead")} ({teamLeads.length})
          </h3>
        </div>

        {teamLeads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {t("reports.noReportsSubmitted")}
            </CardContent>
          </Card>
        ) : (
          teamLeads.map((tl) => {
            const report = tl.todayReport;
            const hasReview = Boolean(report?.reportManagerStatus || report?.reportManagerReview);
            const isApproved = report?.reportManagerStatus === "approved";
            const isRejected = report?.reportManagerStatus === "rejected";
            const currentLoading = actionLoading[tl.id];
            const currentSuccessMsg = actionSuccess[tl.id];
            const currentErrorMsg = remarkErrors[tl.id];

            return (
              <Card key={tl.id} className="overflow-hidden border border-border shadow-sm">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold text-foreground">
                          {tl.name}
                        </CardTitle>
                        <Badge variant="soft" className="text-xs">
                          {formatDisplayName(tl.teamName)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          ({tl.department})
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("reports.reportDate")}: {formatDate(todayDateStr)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-5">
                  {!report ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                      <Clock className="mx-auto h-5 w-5 text-muted-foreground/60 mb-1" />
                      {t("reports.noReportToday")}
                    </div>
                  ) : (
                    <>
                      {/* Submitted Report Content (Read-Only) */}
                      <div className="space-y-3 rounded-lg border bg-card p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            {t("reports.reportDetails")}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider">
                            {report.status === "approved" ? t("reports.approved") : report.status === "rejected" ? t("reports.rejected") : report.status === "submitted" ? t("reports.pending") : report.status}
                          </Badge>
                        </div>

                        {report.completedWork ? (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-foreground">{t("reports.completedTasks")}:</span>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                              {report.completedWork}
                            </p>
                          </div>
                        ) : null}

                        {report.pendingWork ? (
                          <div className="space-y-1 pt-2 border-t">
                            <span className="text-xs font-semibold text-foreground">{t("reports.pendingTasks")}:</span>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                              {report.pendingWork}
                            </p>
                          </div>
                        ) : null}

                        {report.blockers ? (
                          <div className="space-y-1 pt-2 border-t">
                            <span className="text-xs font-semibold text-destructive">{t("reports.blockers")}:</span>
                            <p className="text-sm whitespace-pre-wrap text-destructive/90 leading-relaxed">
                              {report.blockers}
                            </p>
                          </div>
                        ) : null}

                        {report.requiredClarification ? (
                          <div className="space-y-1 pt-2 border-t">
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              {t("reports.clarifications")}:
                            </span>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                              {report.requiredClarification}
                            </p>
                          </div>
                        ) : null}

                        {report.dailyMeetingUpdate ? (
                          <div className="space-y-1 pt-2 border-t">
                            <span className="text-xs font-semibold text-foreground">{t("reports.dailyMeetingUpdate")}:</span>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                              {report.dailyMeetingUpdate}
                            </p>
                          </div>
                        ) : null}

                        {report.attachmentLink ? (
                          <div className="pt-2 border-t text-xs flex items-center gap-1">
                            <span className="font-semibold text-foreground mr-1">{t("reports.attachments")}:</span>
                            <a
                              href={report.attachmentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <span>{report.attachmentLink}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : null}

                        {/* Construction Tables */}
                        {Boolean(
                          report.constructionWorkPlan?.length ||
                          report.constructionMaterialUtilization?.length ||
                          report.constructionTomorrowWorkPlan?.length
                        ) && (
                          <div className="pt-2 border-t">
                            <ConstructionReportPreview report={report as any} />
                          </div>
                        )}

                        {/* Marketing Tables */}
                        {Boolean(
                          report.marketingSelfItems?.length ||
                          report.marketingClientItems?.length
                        ) && (
                          <div className="pt-2 border-t">
                            <MarketingReportPreview report={report as any} />
                          </div>
                        )}

                        {/* Fallback if all fields are empty */}
                        {!report.completedWork &&
                          !report.pendingWork &&
                          !report.blockers &&
                          !report.requiredClarification &&
                          !report.attachmentLink &&
                          !report.dailyMeetingUpdate &&
                          !report.constructionWorkPlan?.length &&
                          !report.constructionMaterialUtilization?.length &&
                          !report.constructionTomorrowWorkPlan?.length &&
                          !report.marketingSelfItems?.length &&
                          !report.marketingClientItems?.length && (
                            <p className="text-xs text-muted-foreground italic py-1">
                              {t("reports.noReportsSubmitted")}
                            </p>
                          )}
                      </div>

                      {/* Existing Review Status Banner if already reviewed */}
                      {hasReview && (
                        <div
                          className={`rounded-lg p-3 text-xs flex items-center justify-between border ${
                            isApproved
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : isRejected
                              ? "bg-destructive/10 border-destructive/20 text-destructive"
                              : "bg-muted border-border text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isApproved ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            ) : isRejected ? (
                              <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                            ) : null}
                            <span>
                              <strong>{t("common.status")}: {isApproved ? t("reports.approved") : isRejected ? t("reports.rejected") : report.reportManagerStatus}</strong>
                              {report.reportManagerReviewedByName ? ` · ${t("auditLogs.performedBy")} ${report.reportManagerReviewedByName}` : ""}
                            </span>
                          </div>
                          <span className="text-[11px] opacity-80">
                            {t("common.edit")}
                          </span>
                        </div>
                      )}

                      {/* Report Manager Remark Field */}
                      <div className="space-y-2 pt-1">
                        <Label htmlFor={`remark-${tl.id}`} className="text-sm font-semibold text-foreground flex items-center justify-between">
                          <span>{t("reports.rmRemark")}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ({t("validation.required")})
                          </span>
                        </Label>
                        <Textarea
                          id={`remark-${tl.id}`}
                          value={remarks[tl.id] ?? ""}
                          onChange={(e) => handleRemarkChange(tl.id, e.target.value)}
                          placeholder={`${t("reports.rmRemark")}...`}
                          className={`min-h-[80px] resize-y text-sm bg-background leading-relaxed ${
                            currentErrorMsg ? "border-destructive focus-visible:ring-destructive" : ""
                          }`}
                        />

                        {currentErrorMsg && (
                          <p className="text-xs font-medium text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {currentErrorMsg}
                          </p>
                        )}

                        {currentSuccessMsg && (
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {currentSuccessMsg}
                          </p>
                        )}

                        {/* Action Buttons for this Team Lead */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={Boolean(currentLoading)}
                            onClick={() => handleReviewAction(tl, "approve")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-4"
                          >
                            {currentLoading === "approve"
                              ? t("common.submitting")
                              : isApproved
                              ? t("reports.approved")
                              : t("common.approve")}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={Boolean(currentLoading)}
                            onClick={() => handleReviewAction(tl, "reject")}
                            className="font-medium text-xs h-8 px-4"
                          >
                            {currentLoading === "reject"
                              ? t("common.submitting")
                              : isRejected
                              ? t("reports.rejected")
                              : t("common.reject")}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Report Manager Separate Note / Additional Remarks Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            {t("reports.managementRemarks")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("reports.managementRemarks")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={additionalRemarks}
            onChange={(e) => setAdditionalRemarks(e.target.value)}
            placeholder={`${t("reports.managementRemarks")}...`}
            className="min-h-[120px] resize-y text-sm bg-background leading-relaxed"
          />

          <div className="pt-2">
            <Button
              type="button"
              disabled={isSubmittingReport}
              onClick={handleSubmitManagerReport}
              className="w-full sm:w-auto h-10 px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              {isSubmittingReport ? t("common.submitting") : t("common.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
