"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileDown,
  Check,
  X,
  Loader2,
  Clock,
  User,
  ArrowRightLeft
} from "lucide-react";

type FinanceItem = { particulars: string; amountINR: number; amountSAR: number; _id?: string };
type BankBalance = { bankName: string; openingBalance: number; receipts: number; payments: number; closingBalance: number; _id?: string };

type FinanceReportData = {
  _id: string;
  reportDate: string;
  submittedByName: string;
  
  expenses: FinanceItem[];
  receipts: FinanceItem[];
  payments: FinanceItem[];
  bankBalances: BankBalance[];
  cashBalance: { pettyCash: number; total: number };
  nextDayApprovals: FinanceItem[];
  
  summary: {
    totalExpenses: number;
    totalReceipts: number;
    totalPayments: number;
    bankBalance: number;
    pettyCashBalance: number;
    description: string;
  };
  
  exchangeRate: number;
  
  status: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
};

type FinanceReportDetailProps = {
  report: FinanceReportData;
  canApprove: boolean;
  canForward?: boolean;
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
    forwarded_to_ceo: { className: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-300", label: "Forwarded to CEO" },
    approved: { className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300", label: "Approved" },
    rejected: { className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300", label: "Rejected" }
  };
  const v = variants[status] || variants.pending;
  return <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${v.className}`}>{v.label}</Badge>;
}

export function FinanceReportDetail({ report, canApprove, canForward = false, canEdit }: FinanceReportDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const approvalMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: "approve" | "reject" | "forward"; reason?: string }) => {
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

  const renderTable = (title: string, items: FinanceItem[] = []) => (
    <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
      <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b">
        <div>Particulars</div>
        <div className="text-right">Amount (INR)</div>
        <div className="text-right">Amount (Riyal)</div>
      </div>
      {items.length === 0 && (
        <div className="p-4 text-center text-sm text-muted-foreground">No records</div>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-4 py-2 items-center border-b last:border-0 text-sm">
          <div>{item.particulars}</div>
          <div className="text-right tabular-nums">{formatCurrency(item.amountINR)}</div>
          <div className="text-right tabular-nums text-muted-foreground">{formatCurrency(item.amountSAR, "SAR")}</div>
        </div>
      ))}
      {items.length > 0 && (
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-4 py-3 bg-muted/10 font-bold items-center text-sm">
          <div>Total</div>
          <div className="text-right tabular-nums text-primary">
            {formatCurrency(items.reduce((sum, i) => sum + i.amountINR, 0))}
          </div>
          <div className="text-right tabular-nums text-muted-foreground">
            {formatCurrency(items.reduce((sum, i) => sum + i.amountSAR, 0), "SAR")}
          </div>
        </div>
      )}
    </div>
  );

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
            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{report.submittedByName}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatDate(report.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && report.status === "pending" && (
            <Button variant="outline" onClick={() => router.push(`/finance/${report._id}/edit`)}>Edit Report</Button>
          )}
          <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Generate PDF
          </Button>
        </div>
      </div>

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
          {report.rejectionReason && <p className="pl-8 text-sm text-rose-600 dark:text-rose-400">Reason: {report.rejectionReason}</p>}
        </div>
      )}

      {/* Exchange Rate */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>Exchange Rate: 1 INR = {(report.exchangeRate || 0).toFixed(4)} SAR</span>
      </div>

      {/* Tables */}
      {renderTable("Expenses", report.expenses)}
      {renderTable("Receipts", report.receipts)}
      {renderTable("Payments", report.payments)}

      {/* Bank Balances */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
          <h3 className="font-semibold">Bank Balance</h3>
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b min-w-[600px]">
            <div>Bank Name</div>
            <div className="text-right">Opening Bal</div>
            <div className="text-right">Receipts</div>
            <div className="text-right">Payments</div>
            <div className="text-right">Closing Bal</div>
          </div>
          {report.bankBalances?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No bank accounts</div>
          )}
          {report.bankBalances?.map((bank, idx) => (
            <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 items-center border-b last:border-0 text-sm min-w-[600px]">
              <div>{bank.bankName}</div>
              <div className="text-right tabular-nums">{formatCurrency(bank.openingBalance)}</div>
              <div className="text-right tabular-nums">{formatCurrency(bank.receipts)}</div>
              <div className="text-right tabular-nums">{formatCurrency(bank.payments)}</div>
              <div className="text-right tabular-nums font-semibold">{formatCurrency(bank.closingBalance)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash Balance */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
          <h3 className="font-semibold">Cash Balance</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">Petty Cash (INR)</label>
            <div className="text-sm tabular-nums">{formatCurrency(report.cashBalance?.pettyCash || 0)}</div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">Total (INR)</label>
            <div className="h-10 flex items-center font-bold text-lg text-primary tabular-nums">
              {formatCurrency(report.cashBalance?.total || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Next Day Approval Required (Only show if exists) */}
      {report.nextDayApprovals?.length > 0 && (
        <div className="mb-6">
          {renderTable("Next Day Approval Required", report.nextDayApprovals)}
          
          {/* CEO Approval section for next day items */}
          {canApprove && report.status === "forwarded_to_ceo" && (
            <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-soft dark:border-blue-800 dark:bg-blue-950/30">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Next Day Approval Required - Actions</h3>
              <p className="text-xs text-blue-700 dark:text-blue-300">The Finance Team has requested approval for the next day's particulars.</p>
              
              {showRejectForm ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Enter rejection reason (optional)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" disabled={approvalMutation.isPending} onClick={() => approvalMutation.mutate({ action: "reject", reason: rejectReason })}>
                      {approvalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Confirm Reject
                    </Button>
                    <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={approvalMutation.isPending}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={() => approvalMutation.mutate({ action: "approve" })} disabled={approvalMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                    {approvalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Approve All
                  </Button>
                  <Button variant="destructive" onClick={() => setShowRejectForm(true)} disabled={approvalMutation.isPending}>
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
          <h3 className="font-semibold">Summary</h3>
        </div>
        <div className="grid grid-cols-[1.5fr_1fr_2fr] gap-4 p-4 bg-muted/10 items-start">
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-1">
              <span className="text-sm">Total Expenses</span>
              <span className="font-semibold tabular-nums text-danger">{formatCurrency(report.summary?.totalExpenses || 0)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-sm">Total Receipts</span>
              <span className="font-semibold tabular-nums text-success">{formatCurrency(report.summary?.totalReceipts || 0)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-sm">Total Payments</span>
              <span className="font-semibold tabular-nums text-danger">{formatCurrency(report.summary?.totalPayments || 0)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-sm">Bank Balance</span>
              <span className="font-semibold tabular-nums text-primary">{formatCurrency(report.summary?.bankBalance || 0)}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-sm">Petty Cash Balance</span>
              <span className="font-semibold tabular-nums">{formatCurrency(report.summary?.pettyCashBalance || 0)}</span>
            </div>
          </div>
          <div></div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Description</label>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[100px]">
              {report.summary?.description || "No description provided."}
            </div>
          </div>
        </div>
      </div>

      {/* Standard Approval Actions if no Next Day Approvals exist */}
      {(!report.nextDayApprovals || report.nextDayApprovals.length === 0) && canApprove && report.status === "forwarded_to_ceo" && (
        <div className="space-y-4 rounded-xl border border-cardBorder bg-card p-5 shadow-soft mt-6">
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
                <Button variant="destructive" disabled={approvalMutation.isPending} onClick={() => approvalMutation.mutate({ action: "reject", reason: rejectReason })}>
                  {approvalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Confirm Reject
                </Button>
                <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={approvalMutation.isPending}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={() => approvalMutation.mutate({ action: "approve" })} disabled={approvalMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {approvalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Approve Report
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectForm(true)} disabled={approvalMutation.isPending}>
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Forward Action */}
      {canForward && report.status === "pending" && (
        <div className="space-y-4 rounded-xl border border-cardBorder bg-card p-5 shadow-soft mt-6">
          <h3 className="text-sm font-semibold">Forward to CEO</h3>
          <Button
            onClick={() => approvalMutation.mutate({ action: "forward" })}
            disabled={approvalMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {approvalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Forward to CEO
          </Button>
        </div>
      )}
    </div>
  );
}
