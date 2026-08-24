"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type ReportReviewDialogProps = {
  reportId: string;
  employeeName: string;
  reportDate: string | Date;
  status: string;
  existingReviewNotes?: string;
  existingRejectionReason?: string;
  reviewerName?: string;
  userRole: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function ReportReviewDialog({
  reportId,
  employeeName,
  reportDate,
  status,
  existingReviewNotes = "",
  existingRejectionReason = "",
  reviewerName,
  userRole,
  onSuccess,
  onClose
}: ReportReviewDialogProps) {
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState(existingReviewNotes);
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

      if (action === "reject" && !rejectionReason.trim() && !reviewNotes.trim()) {
        setErrorMsg("Please enter a reason or review notes for rejection.");
        setIsSubmitting(false);
        return;
      }

      await api.post(`/api/reports/${reportId}/approve`, {
        action,
        reviewNotes: reviewNotes.trim(),
        rejectionReason: rejectionReason.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-card-foreground">Review & Verify Report</h2>
            <p className="text-xs text-muted-foreground">
              {employeeName} · {formattedDate}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            ✕
          </Button>
        </div>

        {reviewerName && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs">
            <span className="font-semibold text-textPrimary">Previous Review:</span> Reviewed by{" "}
            <span className="font-semibold">{reviewerName}</span>
            {existingReviewNotes && <p className="mt-1 italic text-muted-foreground">"{existingReviewNotes}"</p>}
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block font-semibold text-textPrimary">Select Verification Action</label>
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
                Verify & Approve
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
                Reject Report
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="review-notes" className="mb-1 block font-semibold text-textPrimary">
              Review Details / Feedback Notes
            </label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={`Enter review feedback notes as ${userRole.toUpperCase()}...`}
              rows={3}
              className="w-full text-xs"
            />
          </div>

          {action === "reject" && (
            <div>
              <label htmlFor="rejection-reason" className="mb-1 block font-semibold text-textPrimary">
                Rejection Reason (Required)
              </label>
              <Input
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State specific issues preventing approval..."
                className="w-full text-xs"
              />
            </div>
          )}

          {errorMsg && <div className="text-xs font-semibold text-danger">{errorMsg}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={action === "approve" ? "bg-success text-white hover:bg-success/90" : "bg-danger text-white hover:bg-danger/90"}
          >
            {isSubmitting
              ? "Saving..."
              : action === "approve"
              ? "Confirm Verification"
              : "Confirm Rejection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
