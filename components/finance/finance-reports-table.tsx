"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, Plus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { decryptPayload } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useTranslation } from "@/lib/i18n";

type BankBalance = {
  bankName: string;
  openingBalance: number;
  receipts: number;
  payments: number;
  closingBalance: number;
};

type FinanceReportItem = {
  id: string;
  _id?: string;
  reportDate: string | Date;
  submittedByName: string;
  submittedBy?: string;
  status: string;
  totalIncome?: number;
  totalExpense?: number;
  summary?: {
    totalReceipts?: number;
    totalExpenses?: number;
    totalPayments?: number;
    bankBalance?: number;
    pettyCashBalance?: number;
    description?: string;
  };
  items?: { type: string; particulars: string; amountINR: number; revisionReference?: string; paymentMode?: string }[];
  bankBalances?: BankBalance[];
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variants: Record<string, { className: string; label: string }> = {
    pending: {
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
      label: t("reports.status.pending", "Pending")
    },
    approved: {
      className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      label: t("reports.status.approved", "Approved")
    },
    rejected: {
      className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
      label: t("reports.status.rejected", "Rejected")
    }
  };
  const v = variants[status] || variants.pending;
  return <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.className}`}>{v.label}</Badge>;
}

export function FinanceReportsTable({
  canCreate = false
}: {
  canCreate?: boolean;
}) {
  const { t, isRtl } = useTranslation();
  const selectedCompanyId = useSelectedCompany();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: rawReports = [], isLoading } = useQuery({
    queryKey: ["finance-reports-list", selectedCompanyId],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "100" };
      if (selectedCompanyId && selectedCompanyId !== "all") {
        params.workspaceId = selectedCompanyId;
      }
      const res = await api.get("/api/finance-reports", { params });
      const payload = res.data;
      if (payload?.encryptedData) {
        return (await decryptPayload(payload.encryptedData)) as FinanceReportItem[];
      }
      return (payload?.data || []) as FinanceReportItem[];
    }
  });

  const filteredReports = useMemo(() => {
    return rawReports.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const dateStr = formatDate(report.reportDate).toLowerCase();
        const submitter = (report.submittedByName || "").toLowerCase();
        const status = (report.status || "").toLowerCase();
        if (!dateStr.includes(q) && !submitter.includes(q) && !status.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rawReports, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-cardBorder bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isRtl ? "right-3" : "left-3"}`} />
          <Input
            className={isRtl ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}
            placeholder={t("common.search", "Search reports...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">{t("reports.allStatus", "All Statuses")}</option>
            <option value="pending">{t("reports.status.pending", "Pending")}</option>
            <option value="approved">{t("reports.status.approved", "Approved")}</option>
            <option value="rejected">{t("reports.status.rejected", "Rejected")}</option>
          </select>

          <Badge variant="soft" className="px-3 py-1 text-xs">
            {filteredReports.length} {t("nav.reports", "Reports")}
          </Badge>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold text-textPrimary">{t("finance.noReports", "No Finance Reports")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {canCreate
              ? t("finance.getStarted", "Get started by creating your first finance report.")
              : t("finance.noSubmittedReports", "No finance reports found for this company/workspace.")}
          </p>
          {canCreate && (
            <Button asChild className="mt-4 bg-primary hover:bg-primaryDark text-primary-foreground font-bold shadow-md">
              <Link href="/finance/create">
                <Plus className="mr-2 h-4 w-4" />
                {t("finance.createReport", "Create Report")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
          {/* Table Header */}
          <div className="hidden border-b bg-muted/40 px-4 py-3 sm:grid sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr] sm:items-center sm:gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary">{t("reports.date", "Date")}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary">{t("reports.submittedBy", "Submitted By")}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary text-right">{t("finance.totalIncome", "Total Income")}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary text-right">{t("finance.totalExpense", "Total Expense")}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary text-center">{t("reports.status.label", "Status")}</div>
          </div>

          {/* Table Rows */}
          {filteredReports.map((report) => {
            const reportId = String(report.id || report._id);
            const totalIncome =
              report.totalIncome ??
              report.summary?.totalReceipts ??
              (report.items
                ? report.items
                    .filter((i) => i.type === "receipt" && i.particulars !== "Bank to Cash" && !i.revisionReference?.startsWith("link_cash_") && i.paymentMode !== "transfer_to_cash")
                    .reduce((sum, i) => sum + (Number(i.amountINR) || 0), 0)
                : report.bankBalances?.reduce((sum, b) => (b.bankName === "Cash" ? sum : sum + (Number(b.receipts) || 0)), 0)) ??
              0;

            const totalExpense =
              report.totalExpense ??
              report.summary?.totalExpenses ??
              report.summary?.totalPayments ??
              (report.items
                ? report.items
                    .filter((i) => i.type === "expense" || i.type === "payment")
                    .reduce((sum, i) => sum + (Number(i.amountINR) || 0), 0)
                : report.bankBalances?.reduce((sum, b) => sum + (Number(b.payments) || 0), 0)) ??
              0;

            return (
              <div
                key={reportId}
                className="group relative flex flex-col gap-2 border-b px-4 py-3.5 transition-colors hover:bg-accent/10 sm:grid sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr] sm:items-center sm:gap-4 last:border-b-0"
              >
                <Link href={`/finance/${reportId}`} className="absolute inset-0 z-0" aria-label="View Report" />

                <div className="font-medium text-sm pointer-events-none relative z-0 text-textPrimary">
                  {formatDate(report.reportDate)}
                </div>
                <div className="text-sm font-semibold text-foreground pointer-events-none relative z-0 flex items-center gap-1.5">
                  <span>{report.submittedByName || "Finance User"}</span>
                </div>
                <div className="text-sm font-semibold tabular-nums text-right pointer-events-none relative z-0 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalIncome)}
                </div>
                <div className="text-sm font-semibold tabular-nums text-right pointer-events-none relative z-0 text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalExpense)}
                </div>
                <div className="flex sm:justify-center pointer-events-none relative z-0">
                  <StatusBadge status={report.status || "pending"} />
                </div>

                {/* Mobile breakdown */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 sm:hidden">
                  <span>By: <strong className="text-foreground">{report.submittedByName}</strong></span>
                  <span>Income: <strong className="text-emerald-600">{formatCurrency(totalIncome)}</strong></span>
                  <span>Expense: <strong className="text-rose-600">{formatCurrency(totalExpense)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
