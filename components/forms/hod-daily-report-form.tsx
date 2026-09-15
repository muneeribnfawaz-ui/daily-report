"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatDate, formatDisplayName } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  Building2,
  ExternalLink,
  MessageSquareQuote
} from "lucide-react";
import { ConstructionReportPreview } from "@/components/reports/construction-report-preview";
import { MarketingReportPreview } from "@/components/reports/marketing-report-preview";
import type { SessionUser } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

type TeamLeadTodayItem = {
  id: string;
  name: string;
  teamName: string;
  department: string;
  departments?: string[];
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

export function HodDailyReportForm({ editDate }: { editDate?: string }) {
  const { t, isRtl } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [attachmentLinks, setAttachmentLinks] = useState<Record<string, string>>({});
  const [additionalRemarks, setAdditionalRemarks] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});
  const [isPrefilled, setIsPrefilled] = useState(false);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const activeDate = editDate || todayDateStr;

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  const { data: teamLeads = [], isLoading: isTeamLeadsLoading } = useQuery<TeamLeadTodayItem[]>({
    queryKey: ["report-manager-team-leads-today"],
    queryFn: async () => {
      const res = await api.get("/api/report-manager/team-leads-today");
      return res.data?.data || [];
    }
  });

  const { data: existingReports, isLoading: isReportsLoading } = useQuery({
    queryKey: ["hod-edit-reports", editDate],
    queryFn: async () => {
      if (!editDate) return [];
      const response = await api.get(`/api/reports/my?date=${editDate}`);
      return response.data?.data || [];
    },
    enabled: Boolean(editDate)
  });

  const departments: string[] = useMemo(() => {
    if (!currentUser?.departments) return [];
    return currentUser.departments
      .map((d) => (typeof d === "string" ? d : d.name))
      .filter((name): name is string => Boolean(name && name.trim()));
  }, [currentUser]);

  // Prefill effect for edit mode
  useEffect(() => {
    if (editDate && existingReports && existingReports.length > 0 && !isPrefilled) {
      const newFormData: Record<string, string> = {};
      const newAttachmentLinks: Record<string, string> = {};
      let meetingUpdate = "";

      existingReports.forEach((r: any) => {
        if (r.teamName) {
          newFormData[r.teamName] = r.completedWork || "";
          if (r.attachmentLink) {
            newAttachmentLinks[r.teamName] = r.attachmentLink;
          }
        }
        if (r.dailyMeetingUpdate && !meetingUpdate) {
          meetingUpdate = r.dailyMeetingUpdate;
        }
      });

      setFormData(newFormData);
      setAttachmentLinks(newAttachmentLinks);
      if (meetingUpdate) {
        setAdditionalRemarks(meetingUpdate);
      }
      setIsPrefilled(true);
    }
  }, [editDate, existingReports, isPrefilled]);

  const isLoading = isUserLoading || isTeamLeadsLoading || (Boolean(editDate) && isReportsLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-destructive font-medium border border-destructive/20 rounded-xl bg-destructive/10">
        {t("validation.departmentRequired")}
      </div>
    );
  }

  const handleDeptReportChange = (dept: string, value: string) => {
    setFormData((prev) => ({ ...prev, [dept]: value }));
    if (validationErrors[dept] && value.trim()) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[dept];
        return next;
      });
    }
  };

  const handleAttachmentChange = (dept: string, value: string) => {
    setAttachmentLinks((prev) => ({ ...prev, [dept]: value }));
    if (attachmentErrors[dept]) {
      setAttachmentErrors((prev) => {
        const next = { ...prev };
        delete next[dept];
        return next;
      });
    }
  };

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate each department's HOD report
    const errors: Record<string, string> = {};
    const urlErrors: Record<string, string> = {};
    let hasError = false;

    for (const dept of departments) {
      if (!formData[dept] || !formData[dept].trim()) {
        errors[dept] = `${t("validation.required")}`;
        hasError = true;
      }

      const link = attachmentLinks[dept]?.trim();
      if (link && !isValidUrl(link)) {
        urlErrors[dept] = "Please enter a valid URL (e.g., https://example.com).";
        hasError = true;
      }
    }

    if (hasError) {
      setValidationErrors(errors);
      setAttachmentErrors(urlErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const workspaceId = currentUser?.workspaceId;
      if (!workspaceId) throw new Error("Missing workspace context");

      // Submit one report per department
      for (const dept of departments) {
        const payload = {
          workspaceId,
          teamName: dept,
          reportType: "Daily Update",
          reportDate: activeDate,
          completedWork: formData[dept].trim(),
          pendingWork: "",
          blockers: "",
          requiredClarification: "",
          attachmentLink: (attachmentLinks[dept] || "").trim(),
          dailyMeetingUpdate: additionalRemarks.trim()
        };

        await api.post("/api/reports", payload);
      }

      queryClient.invalidateQueries({ queryKey: ["my-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });

      router.push("/daily-report/my-reports");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setIsSubmitting(false);
      const msg = err.response?.data?.message || err.message || t("common.error");
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Header Info */}
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold uppercase">
              {t("roles.hod")} {t("reports.reportDetails")}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {editDate ? `${t("common.edit")} ${formatDate(editDate)}` : `${t("reports.reportDate")}: ${formatDate(todayDateStr)}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("reports.descAllReports")}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Department Sections */}
      <div className="space-y-12">
        {departments.map((dept, deptIndex) => {
          // Filter Team Leads belonging to this department
          const deptTeamLeads = teamLeads.filter((tl) => {
            if (tl.department === dept) return true;
            if (tl.departments && tl.departments.includes(dept)) return true;
            return false;
          });

          return (
            <div
              key={dept}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Department Heading Banner */}
              <div className="bg-muted/40 border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {deptIndex + 1}
                  </div>
                  <h2 className="text-base font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    {dept}
                  </h2>
                </div>
                <Badge variant="soft" className="text-xs font-medium">
                  {deptTeamLeads.length} {t("roles.teamLead")}
                </Badge>
              </div>

              <div className="p-6 space-y-6">
                {/* Team Leads Reports Section */}
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-primary" />
                    {t("roles.teamLead")} ({dept})
                  </div>

                  {deptTeamLeads.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center text-xs text-muted-foreground">
                      {t("reports.noReportsSubmitted")}
                    </div>
                  ) : (
                    deptTeamLeads.map((tl) => {
                      const report = tl.todayReport;
                      const hasReview = Boolean(
                        report?.reportManagerStatus || report?.reportManagerReview || report?.reportManagerReviewedByName
                      );
                      const isApproved = report?.reportManagerStatus === "approved";
                      const isRejected = report?.reportManagerStatus === "rejected";

                      return (
                        <Card key={tl.id} className="border border-border/80 shadow-none overflow-hidden bg-background">
                          <CardHeader className="bg-muted/20 py-3 px-4 border-b">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-semibold text-foreground">
                                  {tl.name}
                                </CardTitle>
                                <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                                  {formatDisplayName(tl.teamName)}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {t("reports.reportDate")}: {formatDate(activeDate)}
                              </span>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 space-y-4">
                            {!report ? (
                              <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                                <Clock className="h-4 w-4 text-muted-foreground/60" />
                                <span>{t("reports.noReportToday")}</span>
                              </div>
                            ) : (
                              <>
                                {/* Read-Only Daily Report Details */}
                                <div className="space-y-3 rounded-lg border bg-muted/10 p-3.5">
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
                                      <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                        {report.completedWork}
                                      </p>
                                    </div>
                                  ) : null}

                                  {report.pendingWork ? (
                                    <div className="space-y-1 pt-2 border-t">
                                      <span className="text-xs font-semibold text-foreground">{t("reports.pendingTasks")}:</span>
                                      <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                        {report.pendingWork}
                                      </p>
                                    </div>
                                  ) : null}

                                  {report.blockers ? (
                                    <div className="space-y-1 pt-2 border-t">
                                      <span className="text-xs font-semibold text-destructive">{t("reports.blockers")}:</span>
                                      <p className="text-xs whitespace-pre-wrap text-destructive/90 leading-relaxed">
                                        {report.blockers}
                                      </p>
                                    </div>
                                  ) : null}

                                  {report.requiredClarification ? (
                                    <div className="space-y-1 pt-2 border-t">
                                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        {t("reports.clarifications")}:
                                      </span>
                                      <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                        {report.requiredClarification}
                                      </p>
                                    </div>
                                  ) : null}

                                  {report.dailyMeetingUpdate ? (
                                    <div className="space-y-1 pt-2 border-t">
                                      <span className="text-xs font-semibold text-foreground">{t("reports.dailyMeetingUpdate")}:</span>
                                      <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
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

                                {/* Read-Only Report Manager Review */}
                                <div className="space-y-2 rounded-lg border bg-muted/10 p-3.5">
                                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <MessageSquareQuote className="h-3.5 w-3.5 text-primary" />
                                      {t("reports.rmRemark")}
                                    </span>
                                    {hasReview ? (
                                      <Badge
                                        variant="outline"
                                        className={`text-[11px] ${
                                          isApproved
                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                            : isRejected
                                            ? "bg-destructive/10 text-destructive border-destructive/20"
                                            : "bg-muted text-foreground border-border"
                                        }`}
                                      >
                                        {isApproved ? t("reports.approved") : isRejected ? t("reports.rejected") : report?.reportManagerStatus}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                        {t("reports.notVerified")}
                                      </Badge>
                                    )}
                                  </div>

                                  {hasReview ? (
                                    <div className="space-y-1.5 pt-1">
                                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                        {report.reportManagerReviewedByName && (
                                          <span>
                                            <strong className="text-foreground">{t("auditLogs.performedBy")}:</strong>{" "}
                                            {report.reportManagerReviewedByName}
                                          </span>
                                        )}
                                        {report.reportManagerReviewedAt && (
                                          <span>
                                            <strong className="text-foreground">{t("auditLogs.timestamp")}:</strong>{" "}
                                            {formatDate(report.reportManagerReviewedAt)}
                                          </span>
                                        )}
                                      </div>
                                      {report.reportManagerReview && (
                                        <div className="pt-1">
                                          <span className="text-xs font-semibold text-foreground">
                                            {isRejected ? `${t("reports.rejected")}:` : `${t("reports.remark")}:`}
                                          </span>
                                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mt-0.5">
                                            {report.reportManagerReview}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic pt-1">
                                      {t("reports.notVerified")}
                                    </p>
                                  )}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* HOD Department Report Textarea */}
                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`dept-report-${dept}`} className="text-sm font-semibold text-foreground flex items-center">
                      {t("roles.hod")} {dept} {t("reports.reportDetails")} <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Textarea
                      id={`dept-report-${dept}`}
                      value={formData[dept] || ""}
                      onChange={(e) => handleDeptReportChange(dept, e.target.value)}
                      placeholder={`${t("reports.completedTasksPlaceholder")}`}
                      className={`min-h-[120px] resize-y bg-background text-foreground text-sm leading-relaxed ${
                        validationErrors[dept] ? "border-destructive focus-visible:ring-destructive/50" : ""
                      }`}
                    />
                    {validationErrors[dept] && (
                      <p className="text-xs font-medium text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {validationErrors[dept]}
                      </p>
                    )}
                  </div>

                  {/* Attachment Link (Optional) for this department */}
                  <div className="space-y-1.5">
                    <Label htmlFor={`attachment-link-${dept}`} className="text-xs font-semibold text-foreground">
                      {t("reports.attachments")} ({t("common.optional")})
                    </Label>
                    <Input
                      id={`attachment-link-${dept}`}
                      type="url"
                      value={attachmentLinks[dept] || ""}
                      onChange={(e) => handleAttachmentChange(dept, e.target.value)}
                      placeholder="https://..."
                      className={`bg-background text-foreground text-sm ${
                        attachmentErrors[dept] ? "border-destructive focus-visible:ring-destructive/50" : ""
                      }`}
                    />
                    {attachmentErrors[dept] && (
                      <p className="text-xs font-medium text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {attachmentErrors[dept]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Additional Remarks for Management Section */}
      <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/40 border-b border-border py-4 px-6">
          <CardTitle className="text-base font-bold text-foreground">
            {t("reports.managementRemarks")}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("reports.managementRemarks")}
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Textarea
            value={additionalRemarks}
            onChange={(e) => setAdditionalRemarks(e.target.value)}
            placeholder={`${t("reports.managementRemarks")}...`}
            className="min-h-[120px] resize-y bg-background text-foreground text-sm leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* Submit Action */}
      <div className="pt-2 flex items-center justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all"
        >
          {isSubmitting ? t("common.submitting") : t("common.submit")}
        </Button>
      </div>
    </form>
  );
}

