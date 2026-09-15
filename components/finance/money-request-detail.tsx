"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  Building2,
  AlertCircle,
  Edit3,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useTranslation } from "@/lib/i18n";

type BankBalanceItem = {
  id: string;
  bankName: string;
  openingBalance: number;
};

export type MoneyRequestDetailData = {
  id: string;
  reportDate: string | Date;
  submittedBy: string;
  submittedByName: string;
  particulars: string;
  description: string;
  amountINR: number;
  amountSAR: number;
  priority: string;
  bankName?: string;
  revisedAmountINR?: number | null;
  revisedAmountSAR?: number | null;
  revisionReference?: string;
  status: string;
  financeReportId?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string;
  reviewedAt?: string | Date | null;
  reviewComment?: string;
  createdAt: string | Date;
  bankBalances?: BankBalanceItem[];
};

interface MoneyRequestDetailProps {
  moneyRequest: MoneyRequestDetailData;
  userRole?: string;
  currentUserId?: string;
  canForward?: boolean;
  canApprove?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatSAR(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 0 })} SAR`;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function PriorityBadge({ priority }: { priority?: string }) {
  const { t } = useTranslation();
  const p = priority?.toLowerCase() || "medium";
  const variants: Record<string, { className: string; label: string }> = {
    urgent: {
      className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 font-bold",
      label: t("moneyRequests.priorityUrgent", "Urgent")
    },
    high: {
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 font-semibold",
      label: t("moneyRequests.priorityHigh", "High")
    },
    medium: {
      className: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300",
      label: t("moneyRequests.priorityMedium", "Medium")
    },
    low: {
      className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300",
      label: t("moneyRequests.priorityLow", "Low")
    }
  };
  const v = variants[p] || variants.medium;
  return (
    <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${v.className}`}>
      {v.label} {t("moneyRequests.priority", "Priority")}
    </Badge>
  );
}

function StatusBadge({ status, userRole }: { status: string; userRole?: string }) {
  const { t } = useTranslation();
  if (userRole === "ceo") {
    if (status === "pending") {
      return (
        <Badge
          variant="outline"
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-none border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300"
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{t("moneyRequests.waitingForHod", "Waiting for HOD's Forward")}</span>
        </Badge>
      );
    }
    if (status === "forwarded_to_ceo") {
      return (
        <Badge
          variant="outline"
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-none border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{t("moneyRequests.pending", "Pending")}</span>
        </Badge>
      );
    }
  }

  const variants: Record<string, { className: string; label: string; icon: any }> = {
    pending: {
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
      label: t("moneyRequests.pendingReview", "Pending Review"),
      icon: Clock
    },
    forwarded_to_ceo: {
      className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300",
      label: t("moneyRequests.forwardedToCeo", "Forwarded to CEO"),
      icon: Clock
    },
    approved: {
      className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
      label: t("moneyRequests.approved", "Approved"),
      icon: CheckCircle2
    },
    rejected: {
      className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
      label: t("moneyRequests.rejected", "Rejected"),
      icon: XCircle
    }
  };
  const v = variants[status] || variants.pending;
  const Icon = v.icon;
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-none ${v.className}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{v.label}</span>
    </Badge>
  );
}

export function MoneyRequestDetail({
  moneyRequest,
  userRole,
  currentUserId,
  canForward = false,
  canApprove = false
}: MoneyRequestDetailProps) {
  const router = useRouter();
  const { t, isRtl } = useTranslation();
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [revisedAmountINRInput, setRevisedAmountINRInput] = useState(
    String(moneyRequest.revisedAmountINR ?? moneyRequest.amountINR ?? "")
  );
  const [revisionReferenceInput, setRevisionReferenceInput] = useState(
    moneyRequest.revisionReference || ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isHod = userRole === "hod" || canForward;
  const isCeoOrAdmin = userRole === "ceo" || userRole === "admin" || canApprove;

  const isPending = moneyRequest.status === "pending";
  const isForwarded = moneyRequest.status === "forwarded_to_ceo";
  const isApproved = moneyRequest.status === "approved";
  const isRejected = moneyRequest.status === "rejected";

  const canHodAction = isHod && !isCeoOrAdmin && isPending;
  const canCeoAction = userRole === "ceo" ? isForwarded : userRole === "admin" ? (isPending || isForwarded) : canApprove && isForwarded;
  const canEdit = isPending && (moneyRequest.submittedBy === currentUserId || userRole === "admin" || userRole === "ceo");

  const hasRevision = moneyRequest.revisedAmountINR !== null && moneyRequest.revisedAmountINR !== undefined;
  const approvedINR = hasRevision ? moneyRequest.revisedAmountINR! : isApproved ? moneyRequest.amountINR : null;
  const approvedSAR = hasRevision ? moneyRequest.revisedAmountSAR! : isApproved ? moneyRequest.amountSAR : null;

  const handleAction = async (action: "forward" | "approve" | "reject", reason?: string) => {
    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const { encryptPayload } = await import("@/lib/crypto");
      const encryptedData = await encryptPayload({ action, reason });

      const res = await fetch(`/api/money-requests/${moneyRequest.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("moneyRequests.failedProcess", "Failed to perform action"));
      }

      if (action === "reject") {
        setIsRejectModalOpen(false);
        setRejectReason("");
      }

      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || t("common.errorOccurred", "An error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRevise = async () => {
    const amount = Number(revisedAmountINRInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg(t("moneyRequests.enterValidAmount", "Please enter a valid revised amount in INR."));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const { encryptPayload } = await import("@/lib/crypto");
      const encryptedData = await encryptPayload({
        action: "approve",
        revisedAmountINR: amount,
        revisionReference: revisionReferenceInput.trim() || "Executive Revision"
      });

      const res = await fetch(`/api/money-requests/${moneyRequest.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("moneyRequests.failedRevise", "Failed to revise and approve request"));
      }

      setIsReviseModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || t("common.errorOccurred", "An error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href="/finance/requests" title={t("common.back", "Back")} aria-label={t("common.back", "Back")}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{moneyRequest.particulars}</h1>
              <StatusBadge status={moneyRequest.status} userRole={userRole} />
            </div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button asChild variant="outline" size="sm" className="rounded-xl border-border">
              <Link href={`/finance/requests/${moneyRequest.id}/edit`}>
                <Edit3 className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5" />
                {t("moneyRequests.editRequest", "Edit Request")}
              </Link>
            </Button>
          )}

          {canHodAction && (
            <>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm"
                onClick={() => handleAction("forward")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5" />}
                {t("moneyRequests.forwardToCeo", "Forward to CEO")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/20 font-semibold rounded-xl"
                onClick={() => {
                  setIsRejectModalOpen(true);
                  setErrorMsg("");
                }}
                disabled={isSubmitting}
              >
                <XCircle className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5" />
                {t("moneyRequests.reject", "Reject")}
              </Button>
            </>
          )}

          {canCeoAction && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm"
                onClick={() => handleAction("approve")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5" />}
                {t("moneyRequests.approveRequest", "Approve Request")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/20 font-semibold rounded-xl"
                onClick={() => {
                  setIsReviseModalOpen(true);
                  setRevisedAmountINRInput(String(moneyRequest.revisedAmountINR ?? moneyRequest.amountINR ?? ""));
                  setRevisionReferenceInput(moneyRequest.revisionReference || "");
                  setErrorMsg("");
                }}
                disabled={isSubmitting}
              >
                <Edit3 className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5" />
                {t("moneyRequests.reviseApprove", "Revise & Approve")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/20 font-semibold rounded-xl"
                onClick={() => {
                  setIsRejectModalOpen(true);
                  setErrorMsg("");
                }}
                disabled={isSubmitting}
              >
                <XCircle className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5" />
                {t("moneyRequests.reject", "Reject")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Audit Banner / Review Alert Box */}
      {isRejected && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {t("moneyRequests.rejectedBy", { name: moneyRequest.reviewedByName || "" }, `Money Request Rejected ${moneyRequest.reviewedByName ? `by ${moneyRequest.reviewedByName}` : ""}`)}
              {moneyRequest.reviewedAt ? ` ${t("common.on", "on")} ${formatDateTime(moneyRequest.reviewedAt)}` : ""}
            </div>
            <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
              <strong className="font-semibold">{t("moneyRequests.reason", "Reason")}:</strong> "{moneyRequest.reviewComment || t("moneyRequests.noReasonProvided", "No specific reason provided.")}"
            </p>
          </div>
        </div>
      )}

      {isForwarded && (
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {t("moneyRequests.forwardedToCeoBanner", "Forwarded to CEO for Executive Approval")}
            </div>
            <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">
              {t("moneyRequests.forwardedByBanner", { name: moneyRequest.reviewedByName || "HOD" }, `Forwarded by ${moneyRequest.reviewedByName || "HOD"}`)}
              {moneyRequest.reviewedAt ? ` ${t("common.on", "on")} ${formatDateTime(moneyRequest.reviewedAt)}` : ""}. {t("moneyRequests.awaitingCeoReview", "Awaiting CEO review.")}
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {t("moneyRequests.approvedBy", { name: moneyRequest.reviewedByName || "" }, `Money Request Approved ${moneyRequest.reviewedByName ? `by ${moneyRequest.reviewedByName}` : ""}`)}
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              {t("moneyRequests.approvedOn", "Approved on")} {moneyRequest.reviewedAt ? formatDateTime(moneyRequest.reviewedAt) : formatDate(moneyRequest.reportDate)}.
              {hasRevision ? ` ${t("moneyRequests.revisedReference", "Revised reference")}: ${moneyRequest.revisionReference || "N/A"}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Requested INR */}
        <div className="rounded-2xl border border-cardBorder bg-card p-5 shadow-soft dark:border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("moneyRequests.requestedAmountInr", "Requested Amount (INR)")}</span>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(moneyRequest.amountINR)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("moneyRequests.inrValue", "INR value")}</div>
        </div>

        {/* Equivalent SAR */}
        <div className="rounded-2xl border border-cardBorder bg-card p-5 shadow-soft dark:border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("moneyRequests.amountSar", "Amount (SAR)")}</span>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {formatSAR(moneyRequest.amountSAR)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("moneyRequests.convertedSar", "Converted SAR amount")}</div>
        </div>

        {/* Approved Amount */}
        <div className="rounded-2xl border border-cardBorder bg-card p-5 shadow-soft dark:border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("moneyRequests.approvedMoney", "Approved Money")}</span>
          <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {approvedINR !== null ? formatCurrency(approvedINR) : "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {hasRevision ? `${t("moneyRequests.revised", "Revised")}: ${formatSAR(approvedSAR!)}` : isApproved ? t("moneyRequests.approvedAsRequested", "Approved as requested") : t("moneyRequests.pendingApproval", "Pending approval")}
          </div>
        </div>

        {/* Priority Card */}
        <div className="rounded-2xl border border-cardBorder bg-card p-5 shadow-soft dark:border-border/60 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("moneyRequests.priorityLevel", "Priority Level")}</span>
          <div className="mt-2">
            <PriorityBadge priority={moneyRequest.priority} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("moneyRequests.submissionPriority", "Submission priority")}</div>
        </div>
      </div>

      {/* Main Details Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Information Card */}
          <div className="rounded-2xl border border-cardBorder bg-card p-6 shadow-soft space-y-5 dark:border-border/60">
            <h2 className="text-base font-bold text-foreground border-b border-border/60 pb-3">{t("moneyRequests.summaryDetails", "Request Summary & Details")}</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("moneyRequests.particulars", "Particulars")}</label>
                <div className="mt-1 text-base font-bold text-foreground">{moneyRequest.particulars}</div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("moneyRequests.targetBank", "Target Bank Account")}</label>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>{moneyRequest.bankName || t("moneyRequests.noBankSelected", "No specific bank selected")}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("moneyRequests.descriptionPurpose", "Description / Purpose")}</label>
              <div className="mt-1.5 rounded-xl bg-muted/40 dark:bg-muted/20 p-4 text-sm text-foreground whitespace-pre-wrap min-h-[90px] border border-border/40">
                {moneyRequest.description || t("common.noDescription", "No description provided.")}
              </div>
            </div>

            {hasRevision && (
              <div className="rounded-xl border border-amber-300/60 bg-amber-500/10 p-4 space-y-2 dark:border-amber-500/30">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  {t("moneyRequests.revisionDetails", "Revision Details")}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t("moneyRequests.revisedAmount", "Revised Amount")}: </span>
                    <span className="font-bold text-foreground">{formatCurrency(moneyRequest.revisedAmountINR!)} ({formatSAR(moneyRequest.revisedAmountSAR!)})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("moneyRequests.revisionReference", "Revision Reference")}: </span>
                    <span className="font-semibold text-foreground">{moneyRequest.revisionReference || "N/A"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Metadata & Audit Sidebar */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="rounded-2xl border border-cardBorder bg-card p-6 shadow-soft space-y-4 dark:border-border/60">
            <h3 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">{t("moneyRequests.submissionMetadata", "Submission Metadata")}</h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> {t("reports.submittedBy", "Submitted By")}
                </span>
                <span className="font-semibold text-foreground">{moneyRequest.submittedByName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {t("reports.reportDate", "Report Date")}
                </span>
                <span className="font-semibold text-foreground">{formatDate(moneyRequest.reportDate)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {t("common.createdAt", "Created At")}
                </span>
                <span className="font-semibold text-foreground">{formatDateTime(moneyRequest.createdAt)}</span>
              </div>

              {moneyRequest.reviewedByName && (
                <>
                  <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                    <span className="text-muted-foreground">{t("reports.reviewedBy", "Reviewed By")}</span>
                    <span className="font-semibold text-foreground">{moneyRequest.reviewedByName}</span>
                  </div>

                  {moneyRequest.reviewedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("reports.reviewedAt", "Reviewed At")}</span>
                      <span className="font-semibold text-foreground">{formatDateTime(moneyRequest.reviewedAt)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revise & Approve Modal Dialog */}
      {isReviseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-cardBorder bg-card text-card-foreground p-6 shadow-2xl dark:border-border/80 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{t("moneyRequests.reviseApproveTitle", "Revise & Approve Money Request")}</h3>
                  <p className="text-xs text-muted-foreground">{t("moneyRequests.reviseApproveSubtitle", "Adjust the approved money amount before approval")}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setIsReviseModalOpen(false)}
                disabled={isSubmitting}
              >
                ✕
              </Button>
            </div>

            {/* Request Summary Card */}
            <div className="rounded-xl bg-muted/60 dark:bg-slate-800/60 p-3.5 text-xs space-y-1.5 border border-border/50">
              <div className="flex justify-between font-semibold text-foreground">
                <span>{moneyRequest.particulars}</span>
                <span className="text-foreground font-bold">{formatCurrency(moneyRequest.amountINR)}</span>
              </div>
              <div className="text-muted-foreground">
                {t("reports.submittedBy", "Submitted by")} <span className="font-medium text-foreground">{moneyRequest.submittedByName}</span>
              </div>
            </div>

            {/* Revised Amount & Reference Form */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="detail-revised-amount-input" className="block text-xs font-semibold text-foreground">
                  {t("moneyRequests.revisedAmountInr", "Revised Amount (INR)")} <span className="text-amber-600 dark:text-amber-400">*</span>
                </label>
                <Input
                  id="detail-revised-amount-input"
                  type="number"
                  value={revisedAmountINRInput}
                  onChange={(e) => {
                    setRevisedAmountINRInput(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder={t("moneyRequests.enterRevisedAmount", "Enter revised INR amount...")}
                  className="w-full text-xs rounded-xl bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="detail-revision-reference-input" className="block text-xs font-semibold text-foreground">
                  {t("moneyRequests.revisionReference", "Revision Reference / Note")}
                </label>
                <Input
                  id="detail-revision-reference-input"
                  value={revisionReferenceInput}
                  onChange={(e) => setRevisionReferenceInput(e.target.value)}
                  placeholder={t("moneyRequests.revisionRefPlaceholder", "e.g. Approved with revised budget allocation")}
                  className="w-full text-xs rounded-xl bg-background border-input text-foreground"
                />
              </div>

              {errorMsg && (
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setIsReviseModalOpen(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold rounded-xl shadow-sm"
                disabled={isSubmitting || !revisedAmountINRInput}
                onClick={handleConfirmRevise}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5 animate-spin" />
                    {t("common.saving", "Saving...")}
                  </>
                ) : (
                  t("moneyRequests.confirmApproveRevision", "Confirm & Approve Revision")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-cardBorder bg-card text-card-foreground p-6 shadow-2xl dark:border-border/80 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{t("moneyRequests.rejectTitle", "Reject Money Request")}</h3>
                  <p className="text-xs text-muted-foreground">{t("moneyRequests.rejectSubtitle", "Provide a reason for rejecting this request")}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isSubmitting}
              >
                ✕
              </Button>
            </div>

            {/* Request Summary Card */}
            <div className="rounded-xl bg-muted/60 dark:bg-slate-800/60 p-3.5 text-xs space-y-1.5 border border-border/50">
              <div className="flex justify-between font-semibold text-foreground">
                <span>{moneyRequest.particulars}</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(moneyRequest.amountINR)}</span>
              </div>
              <div className="text-muted-foreground">
                {t("reports.submittedBy", "Submitted by")} <span className="font-medium text-foreground">{moneyRequest.submittedByName}</span>
              </div>
            </div>

            {/* Rejection Reason Form */}
            <div className="space-y-2">
              <label htmlFor="detail-rejection-reason" className="block text-xs font-semibold text-foreground">
                {t("moneyRequests.reasonForRejection", "Reason for Rejection")} <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <Textarea
                id="detail-rejection-reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder={t("moneyRequests.rejectReasonPlaceholder", "Enter specific reasons why this money request is being rejected...")}
                rows={3}
                className="w-full text-xs rounded-xl bg-background border-input text-foreground"
              />
              {errorMsg && (
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-semibold rounded-xl shadow-sm"
                disabled={isSubmitting || !rejectReason.trim()}
                onClick={() => handleAction("reject", rejectReason.trim())}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-3.5 w-3.5 animate-spin" />
                    {t("moneyRequests.rejecting", "Rejecting...")}
                  </>
                ) : (
                  t("moneyRequests.confirmRejection", "Confirm Rejection")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
