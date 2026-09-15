"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

type ReportReviewDialogProps = {
  reportId: string;
  employeeName: string;
  teamName?: string;
  reportDate: string | Date;
  status: string;
  existingReviewNotes?: string;
  existingRejectionReason?: string;
  reviewerName?: string;
  existingReportManagerStatus?: string;
  existingReportManagerReview?: string;
  existingReportManagerReviewedByName?: string;
  userRole: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function ReportReviewDialog({
  reportId,
  employeeName,
  teamName,
  reportDate,
  status,
  existingReviewNotes = "",
  existingRejectionReason = "",
  reviewerName,
  existingReportManagerStatus,
  existingReportManagerReview,
  existingReportManagerReviewedByName,
  userRole,
  onSuccess,
  onClose
}: ReportReviewDialogProps) {
  const { t, isRtl } = useTranslation();
  const isReportManager = userRole === "report_manager";
  const [action, setAction] = useState<"approve" | "reject">(
    isReportManager && existingReportManagerStatus === "rejected" ? "reject" : "approve"
  );
  const [reviewNotes, setReviewNotes] = useState(
    isReportManager ? (existingReportManagerReview || "") : existingReviewNotes
  );
  const [rejectionReason, setRejectionReason] = useState(existingRejectionReason);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formattedDate = new Date(reportDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg("");

      if (isReportManager) {
        if (!reviewNotes.trim()) {
          setErrorMsg(action === "approve" ? t("validation.remarkRequired") : t("validation.reasonRequired"));
          setIsSubmitting(false);
          return;
        }
      } else {
        if (action === "reject" && !rejectionReason.trim() && !reviewNotes.trim()) {
          setErrorMsg(t("validation.reasonRequired"));
          setIsSubmitting(false);
          return;
        }
      }

      await api.post(`/api/reports/${reportId}/approve`, {
        action,
        reviewNotes: reviewNotes.trim(),
        rejectionReason: isReportManager ? reviewNotes.trim() : rejectionReason.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t("common.error");
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = isReportManager ? Boolean(reviewNotes.trim()) : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-card-foreground">
              {isReportManager
                ? t("reports.rmRemark")
                : t("reports.reportDetails")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {employeeName} {teamName ? `· ${teamName}` : ""} · {formattedDate}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            ✕
          </Button>
        </div>

        {isReportManager && existingReportManagerReviewedByName && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs">
            <span className="font-semibold text-textPrimary">{t("reports.rmRemark")}:</span> {t("auditLogs.performedBy")}{" "}
            <span className="font-semibold">{existingReportManagerReviewedByName}</span> (
            <span className={existingReportManagerStatus === "approved" ? "text-success font-semibold" : "text-danger font-semibold"}>
              {existingReportManagerStatus === "approved" ? t("reports.approved") : t("reports.rejected")}
            </span>)
            {existingReportManagerReview && <p className="mt-1 italic text-muted-foreground">"{existingReportManagerReview}"</p>}
          </div>
        )}

        {!isReportManager && reviewerName && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs">
            <span className="font-semibold text-textPrimary">{t("reports.reviewStatus")}:</span> {t("auditLogs.performedBy")}{" "}
            <span className="font-semibold">{reviewerName}</span>
            {existingReviewNotes && <p className="mt-1 italic text-muted-foreground">"{existingReviewNotes}"</p>}
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block font-semibold text-textPrimary">
              {t("common.actions")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction("approve")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition ${
                  action === "approve"
                    ? "border-success bg-success/10 text-success"
                    : "border-cardBorder bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("reports.approved")}
              </button>

              <button
                type="button"
                onClick={() => setAction("reject")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition ${
                  action === "reject"
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-cardBorder bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <XCircle className="h-4 w-4" />
                {t("reports.rejected")}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="review-notes" className="mb-1 block font-semibold text-textPrimary">
              {isReportManager
                ? action === "approve"
                  ? `${t("reports.rmRemark")} (${t("validation.required")})`
                  : `${t("reports.rejected")} (${t("validation.required")})`
                : t("reports.remark")}
            </label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={`${t("reports.remark")}...`}
              rows={3}
              className="w-full text-xs"
            />
          </div>

          {!isReportManager && action === "reject" && (
            <div>
              <label htmlFor="rejection-reason" className="mb-1 block font-semibold text-textPrimary">
                {t("validation.reasonRequired")}
              </label>
              <Input
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={`${t("validation.reasonRequired")}...`}
                className="w-full text-xs"
              />
            </div>
          )}

          {errorMsg && <div className="text-xs font-semibold text-danger">{errorMsg}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={action === "approve" ? "bg-success text-white hover:bg-success/90" : "bg-danger text-white hover:bg-danger/90"}
          >
            {isSubmitting
              ? t("common.submitting")
              : action === "approve"
              ? t("reports.approved")
              : t("reports.rejected")}
          </Button>
        </div>
      </div>
    </div>
  );
}
