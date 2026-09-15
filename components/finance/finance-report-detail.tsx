"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileDown,
  Check,
  X,
  Loader2,
  Clock,
  User,
  ArrowRightLeft
} from "lucide-react";
import { FinanceEditButton } from "@/components/finance/finance-edit-button";
import { PAYMENT_MODE_LABELS, type PaymentMode } from "@/lib/constants";
import { encryptPayload } from "@/lib/crypto";
import { useTranslation } from "@/lib/i18n";

type FinanceItem = { particulars: string; description?: string; amountINR: number; amountSAR: number; priority?: string; bankName?: string; paymentMode?: string; _id?: string };
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

  editAccessRequested?: boolean;
  editAccessRequestReason?: string;
  editAccessGranted?: boolean;
};

type FinanceReportDetailProps = {
  report: FinanceReportData;
  canApprove: boolean;
  canForward?: boolean;
  canEdit: boolean;
  userRole?: string;
};

function formatCurrency(amount: number, currency: "INR" | "SAR" = "INR"): string {
  if (currency === "SAR") {
    return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string; icon: any }> = {
    pending: {
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
      label: "Pending",
      icon: Clock
    },
    approved: {
      className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      label: "Approved",
      icon: Check
    },
    rejected: {
      className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
      label: "Rejected",
      icon: X
    }
  };
  const v = variants[status] || variants.pending;
  const Icon = v.icon;
  return (
    <Badge className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.className}`}>
      <Icon className="h-3 w-3" />
      <span>{v.label}</span>
    </Badge>
  );
}

export function FinanceReportDetail({ report, canApprove: _canApprove, canEdit, userRole }: FinanceReportDetailProps) {
  const { t, isRtl } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdatingEdit, setIsUpdatingEdit] = useState(false);

  const handleEditApproval = async (approve: boolean) => {
    setIsUpdatingEdit(true);
    try {
      const encryptedData = await encryptPayload({ approve });
      const res = await fetch(`/api/finance-reports/${report._id}/approve-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData })
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["finance-report", report._id] });
        queryClient.invalidateQueries({ queryKey: ["finance-reports"] });
        router.refresh();
      }
    } finally {
      setIsUpdatingEdit(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(`/api/finance-reports/${report._id}/pdf`);
      if (!res.ok) throw new Error("Failed to download PDF");
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

  const renderTable = (title: string, items: FinanceItem[] = []) => {
    const gridCols = "grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_1fr] min-w-[800px]";

    return (
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="border-b border-primary/20 bg-sidebar px-4 py-3 text-sidebarText">
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <div className={`grid ${gridCols} gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b`}>
            <div>{t("moneyRequests.particulars")}</div>
            <div>{t("common.description")}</div>
            <div>{t("finance.bankAccount")}</div>
            <div>{t("finance.paymentMode")}</div>
            <div className="text-right">{t("moneyRequests.amountINR")}</div>
            <div className="text-right">{t("moneyRequests.amountSAR")}</div>
          </div>
          {items.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">{t("reports.noReportsSubmitted")}</div>
          )}
          {items.map((item, idx) => {
            const isInternalTransfer = item.particulars === "Bank to Cash";
            return (
              <div key={idx} className={`grid ${gridCols} gap-2 px-4 py-2 items-center border-b last:border-0 text-sm`}>
                <div className="font-medium flex items-center gap-1.5 flex-wrap">
                  <span>{item.particulars}</span>
                  {isInternalTransfer && (
                    <span className="rounded-md border border-amber-300/60 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {t("finance.transferToCash")}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">{item.description || "-"}</div>
                <div className="text-muted-foreground text-xs">{item.bankName || "-"}</div>
                <div className="text-muted-foreground text-xs">
                  {PAYMENT_MODE_LABELS[item.paymentMode as PaymentMode] || item.paymentMode || "-"}
                </div>
                <div className="text-right tabular-nums">{formatCurrency(item.amountINR)}</div>
                <div className="text-right tabular-nums text-muted-foreground">{formatCurrency(item.amountSAR, "SAR")}</div>
              </div>
            );
          })}
          {items.length > 0 && (
            <div className={`grid ${gridCols} gap-2 px-4 py-3 bg-muted/10 font-bold items-center text-sm`}>
              <div className="col-span-4 flex items-center justify-between pr-4">
                <span>{t("common.total", "Total")}</span>
                {title === t("finance.income") && items.some(i => i.particulars === "Bank to Cash") && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({t("finance.transferToCash")})
                  </span>
                )}
              </div>
              <div className="text-right tabular-nums text-primary">
                {formatCurrency(
                  title === t("finance.income")
                    ? items.filter(i => i.particulars !== "Bank to Cash").reduce((sum, i) => sum + i.amountINR, 0)
                    : items.reduce((sum, i) => sum + i.amountINR, 0)
                )}
              </div>
              <div className="text-right tabular-nums text-muted-foreground">
                {formatCurrency(
                  title === t("finance.income")
                    ? items.filter(i => i.particulars !== "Bank to Cash").reduce((sum, i) => sum + i.amountSAR, 0)
                    : items.reduce((sum, i) => sum + i.amountSAR, 0),
                  "SAR"
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-textPrimary">
              {t("finance.titleDetails")} — {formatDate(report.reportDate)}
            </h2>
            <StatusBadge status={report.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{report.submittedByName}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatDate(report.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report.status === "pending" && (
            <FinanceEditButton
              reportId={report._id}
              canEdit={canEdit}
              editAccessRequested={Boolean(report.editAccessRequested)}
              editAccessGranted={Boolean(report.editAccessGranted)}
              isTMorTL={["team_member", "team_lead"].includes(userRole || "")}
            />
          )}
          <Button onClick={handleDownloadPdf} disabled={isDownloading} className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold shadow-md">
            {isDownloading ? <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`} /> : <FileDown className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />}
            PDF
          </Button>
        </div>
      </div>

      {report.editAccessRequested && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-500/10 px-4 py-3.5 shadow-sm">
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700 dark:text-amber-300">{t("reports.editAccessRequested")}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">{t("reports.pending")}</span>
            </div>
            <p className="text-xs text-textPrimary font-medium">
              {report.submittedByName ? `${report.submittedByName}` : ""} {t("reports.requestEditReason")}
            </p>
            {report.editAccessRequestReason ? (
              <div className="mt-1 text-xs bg-card/90 border border-amber-300/40 rounded-lg p-2.5 text-textPrimary">
                <span className="font-semibold text-amber-800 dark:text-amber-300">{t("common.reason", "Reason")}: </span>
                <span className="italic">"{report.editAccessRequestReason}"</span>
              </div>
            ) : null}
          </div>
          {userRole && ["admin", "ceo", "hod", "team_lead"].includes(userRole) && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="border-danger/30 text-danger hover:bg-danger/10" onClick={() => handleEditApproval(false)} disabled={isUpdatingEdit}>
                {t("reports.rejectEdit")}
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold" onClick={() => handleEditApproval(true)} disabled={isUpdatingEdit}>
                {t("reports.approveEdit")}
              </Button>
            </div>
          )}
        </div>
      )}

      {report.editAccessGranted && !report.editAccessRequested && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300/60 bg-emerald-500/10 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-sm">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{t("reports.editAccessGranted")}</span>
          </div>
          {canEdit && (
            <Button asChild size="sm" className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold">
              <Link href={`/finance/${report._id}/edit`}>{t("common.edit")}</Link>
            </Button>
          )}
        </div>
      )}

      {report.status === "approved" && report.approvedByName && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <Check className="h-5 w-5 text-emerald-600" />
          <div className="text-sm">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{t("reports.approved")}</span> {t("auditLogs.performedBy")} {report.approvedByName}
            {report.approvedAt && <span className="text-muted-foreground"> ({formatDate(report.approvedAt)})</span>}
          </div>
        </div>
      )}

      {report.status === "rejected" && (
        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 dark:border-rose-800 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-rose-600" />
            <div className="text-sm">
              <span className="font-semibold text-rose-700 dark:text-rose-300">{t("reports.rejected")}</span> {t("auditLogs.performedBy")} {report.approvedByName}
              {report.approvedAt && <span className="text-muted-foreground"> ({formatDate(report.approvedAt)})</span>}
            </div>
          </div>
          {report.rejectionReason && <p className="pl-8 text-sm text-rose-600 dark:text-rose-400">{t("common.reason", "Reason")}: {report.rejectionReason}</p>}
        </div>
      )}

      {/* Exchange Rate */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>1 SAR = {(1 / (report.exchangeRate || 0.0428)).toFixed(2)} INR</span>
      </div>

      {/* Tables */}
      {(() => {
        const displayExpenses = (report.expenses && report.expenses.length > 0)
          ? (report.payments && report.payments.length > 0 ? [...report.expenses, ...report.payments] : report.expenses)
          : (report.payments || []);
        return (
          <>
            {renderTable(t("finance.expenses"), displayExpenses)}
            {renderTable(t("finance.income"), report.receipts)}
          </>
        );
      })()}

      {/* Bank Balances */}
      {userRole !== "hod" && (
        <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
          <div className="border-b border-primary/20 bg-sidebar px-4 py-3 text-sidebarText">
            <h3 className="font-semibold">{t("finance.bankBalance")}</h3>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b min-w-[600px]">
              <div>{t("banks.bankName")}</div>
              <div className="text-right">{t("banks.openingBalance")}</div>
              <div className="text-right">{t("finance.income")}</div>
              <div className="text-right">{t("finance.expenses")}</div>
              <div className="text-right">{t("banks.currentBalance")}</div>
            </div>
            {report.bankBalances?.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">{t("banks.titleList")}</div>
            )}
            {report.bankBalances?.map((bank, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 items-center border-b last:border-0 text-sm min-w-[600px]">
                <div>
                  <Link href="/finance/banks" className="hover:underline text-primary font-semibold">
                    {bank.bankName}
                  </Link>
                </div>
                <div className="text-right tabular-nums">{formatCurrency(bank.openingBalance)}</div>
                <div className="text-right tabular-nums">{formatCurrency(bank.receipts)}</div>
                <div className="text-right tabular-nums">{formatCurrency(bank.payments)}</div>
                <div className="text-right tabular-nums font-semibold">{formatCurrency(bank.closingBalance)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="border-b border-primary/20 bg-sidebar px-4 py-3 text-sidebarText">
          <h3 className="font-semibold">{t("finance.summaryNotes")}</h3>
        </div>
        <div className="grid grid-cols-[1.5fr_1fr_2fr] gap-4 p-4 bg-muted/10 items-start">
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-1">
              <span className="text-sm">{t("finance.totalPayments")}</span>
              <span className="font-semibold tabular-nums text-danger">
                {formatCurrency(report.summary?.totalPayments || report.summary?.totalExpenses || 0)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-sm">{t("finance.totalReceipts")}</span>
              <span className="font-semibold tabular-nums text-success">{formatCurrency(report.summary?.totalReceipts || 0)}</span>
            </div>
            {userRole !== "hod" && (
              <>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm">{t("finance.bankBalance")}</span>
                  <span className="font-semibold tabular-nums text-primary">{formatCurrency(report.summary?.bankBalance || 0)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm">{t("finance.pettyCashBalance")}</span>
                  <span className="font-semibold tabular-nums text-primary">{formatCurrency(report.summary?.pettyCashBalance || 0)}</span>
                </div>
              </>
            )}
          </div>
          <div></div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">{t("common.description")}</label>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[100px]">
              {report.summary?.description || t("finance.noDescription")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
