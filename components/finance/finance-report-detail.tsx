"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { FINANCE_REPORT_FIELDS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileDown,
  Check,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  Clock,
  User
} from "lucide-react";

type FinanceReportData = {
  _id: string;
  reportDate: string;
  submittedByName: string;
  openingBalance: number;
  cashReceived: number;
  cardSales: number;
  onlinePayments: number;
  expenses: number;
  refunds: number;
  pettyCash: number;
  bankDeposit: number;
  closingCashBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  exchangeRate: number;
  closingCashBalanceSAR: number;
  totalIncomeSAR: number;
  totalExpensesSAR: number;
  netBalanceSAR: number;
  status: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
};

type FinanceReportDetailProps = {
  report: FinanceReportData;
  canApprove: boolean;
  canEdit: boolean;
};

function formatCurrency(amount: number, currency: "INR" | "SAR" = "INR"): string {
  if (currency === "SAR") {
    return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    pending: { className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300", label: "Pending Approval" },
    approved: { className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300", label: "Approved" },
    rejected: { className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300", label: "Rejected" }
  };
  const v = variants[status] || variants.pending;
  return <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${v.className}`}>{v.label}</Badge>;
}

export function FinanceReportDetail({ report, canApprove, canEdit }: FinanceReportDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const approvalMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: "approve" | "reject"; reason?: string }) => {
      const res = await fetch(`/api/finance-reports/${report._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-report", report._id] });
      queryClient.invalidateQueries({ queryKey: ["finance-reports"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      router.refresh();
    }
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/finance-reports/${report._id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-report-${new Date(report.reportDate).toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getFieldValue = (key: string): number => {
    return (report as unknown as Record<string, number>)[key] ?? 0;
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">
              Finance Report — {formatDate(report.reportDate)}
            </h2>
            <StatusBadge status={report.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {report.submittedByName}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(report.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && report.status === "pending" && (
            <Button variant="outline" onClick={() => router.push(`/finance/${report._id}/edit`)}>
              Edit Report
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Approval Info */}
      {report.status === "approved" && report.approvedByName && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <Check className="h-5 w-5 text-emerald-600" />
          <div className="text-sm">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">Approved</span> by {report.approvedByName}
            {report.approvedAt && <span className="text-muted-foreground"> on {formatDate(report.approvedAt)}</span>}
          </div>
        </div>
      )}

      {report.status === "rejected" && (
        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 dark:border-rose-800 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-rose-600" />
            <div className="text-sm">
              <span className="font-semibold text-rose-700 dark:text-rose-300">Rejected</span> by {report.approvedByName}
              {report.approvedAt && <span className="text-muted-foreground"> on {formatDate(report.approvedAt)}</span>}
            </div>
          </div>
          {report.rejectionReason && (
            <p className="pl-8 text-sm text-rose-600 dark:text-rose-400">Reason: {report.rejectionReason}</p>
          )}
        </div>
      )}

      {/* Finance Table — Read Only */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3.5 text-white dark:from-slate-800 dark:to-slate-700">
          <div className="text-sm font-semibold tracking-wide">Particular</div>
          <div className="text-sm font-semibold tracking-wide text-right">Amount (INR)</div>
          <div className="text-sm font-semibold tracking-wide text-right flex items-center justify-end gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5 opacity-60" />
            Amount (SAR)
          </div>
        </div>

        {FINANCE_REPORT_FIELDS.map((field, idx) => {
          const value = getFieldValue(field.key);
          const sarValue = value * (report.exchangeRate || 0);
          const isClosing = field.key === "closingCashBalance";

          return (
            <div
              key={field.key}
              className={`grid grid-cols-[1fr_1fr_1fr] gap-0 items-center border-b px-4 py-3 ${
                idx % 2 === 0 ? "bg-card" : "bg-muted/30"
              } ${isClosing ? "bg-gradient-to-r from-primary/5 to-transparent" : ""}`}
            >
              <div className="flex items-center gap-2">
                {field.group === "income" && <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />}
                {field.group === "expense" && <TrendingDown className="h-3.5 w-3.5 text-danger shrink-0" />}
                {field.group === "neutral" && <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className={`text-sm ${isClosing ? "font-semibold" : ""}`}>{field.label}</span>
              </div>
              <div className={`text-right font-semibold tabular-nums ${isClosing ? "text-lg text-primary" : ""}`}>
                {formatCurrency(value)}
              </div>
              <div className="text-right text-sm text-muted-foreground tabular-nums">
                {formatCurrency(sarValue, "SAR")}
              </div>
            </div>
          );
        })}

        {/* Totals */}
        <div className="divide-y bg-gradient-to-b from-muted/20 to-muted/5">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-bold text-success">Total Income</span>
            </div>
            <div className="text-right font-bold text-success tabular-nums">{formatCurrency(report.totalIncome)}</div>
            <div className="text-right text-sm text-muted-foreground tabular-nums">{formatCurrency(report.totalIncomeSAR, "SAR")}</div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              <span className="text-sm font-bold text-danger">Total Expenses</span>
            </div>
            <div className="text-right font-bold text-danger tabular-nums">{formatCurrency(report.totalExpenses)}</div>
            <div className="text-right text-sm text-muted-foreground tabular-nums">{formatCurrency(report.totalExpensesSAR, "SAR")}</div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-bold">Net Balance</span>
            </div>
            <div className={`text-right font-bold tabular-nums ${report.netBalance >= 0 ? "text-success" : "text-danger"}`}>
              {formatCurrency(report.netBalance)}
            </div>
            <div className="text-right text-sm text-muted-foreground tabular-nums">{formatCurrency(report.netBalanceSAR, "SAR")}</div>
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>Exchange Rate: 1 INR = {(report.exchangeRate || 0).toFixed(4)} SAR</span>
      </div>

      {/* Approval Actions */}
      {canApprove && report.status === "pending" && (
        <div className="space-y-4 rounded-xl border border-cardBorder bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Approval Actions</h3>

          {showRejectForm ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Enter rejection reason (optional)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={approvalMutation.isPending}
                  onClick={() => approvalMutation.mutate({ action: "reject", reason: rejectReason })}
                >
                  {approvalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                  Confirm Reject
                </Button>
                <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={approvalMutation.isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => approvalMutation.mutate({ action: "approve" })}
                disabled={approvalMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {approvalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={approvalMutation.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          )}

          {approvalMutation.isError && (
            <div className="text-sm text-destructive">
              {(approvalMutation.error as Error).message || "Action failed"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
