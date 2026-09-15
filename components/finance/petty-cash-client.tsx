"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  User,
  History,
  FileText,
  Loader2
} from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { useSelectedCompany } from "@/hooks/use-selected-company";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

interface PettyCashClientProps {
  userRole?: string;
}

export function PettyCashClient({ userRole }: PettyCashClientProps) {
  const { t } = useTranslation();
  const selectedCompanyId = useSelectedCompany();

  // Query Petty Cash Balance & Transactions
  const { data, isLoading } = useQuery({
    queryKey: ["petty-cash-data", selectedCompanyId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedCompanyId && selectedCompanyId !== "all") {
        params.workspaceId = selectedCompanyId;
      }
      const res = await api.get("/api/finance/petty-cash", { params });
      return res.data?.data as { balance: number; transactions: any[] };
    }
  });

  const balance = data?.balance ?? 0;
  const transactions = data?.transactions ?? [];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow={t("nav.finance", "Finance")}
        title={t("pettyCash.title", "Petty Cash Management")}
        description={t("pettyCash.description", "Allocate funds, record office expenses, and track cash-in-hand transaction histories.")}
      />

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stat & Action Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Balance Card */}
            <Card className="relative overflow-hidden border-indigo-500/30 bg-card shadow-soft md:col-span-2">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">{t("pettyCash.runningBalance", "Running Petty Cash Balance")}</span>
                    <h2 className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
                      {formatCurrency(balance)}
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-indigo-500/10 p-3.5 text-indigo-600 dark:text-indigo-400">
                    <Wallet className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Transaction Stats Card */}
            <Card className="bg-card shadow-soft">
              <CardContent className="p-6 space-y-4">
                <span className="text-sm font-medium text-muted-foreground block">{t("pettyCash.transactionStats", "Transaction Stats")}</span>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                      {t("pettyCash.totalAdditions", "Total Additions")}
                    </span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(transactions.filter(t => t.type === "add").reduce((sum, t) => sum + (t.amount || 0), 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                      {t("pettyCash.totalExpenses", "Total Expenses")}
                    </span>
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      {formatCurrency(transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + (t.amount || 0), 0))}
                    </span>
                  </div>
                  <div className="h-px bg-border/60" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("pettyCash.recentLogCount", "Recent log transactions count")}</span>
                    <span className="font-semibold">{t("pettyCash.itemsCount", { count: transactions.length }, `${transactions.length} items`)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Log Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-500" />
              {t("pettyCash.historyLog", "Transaction History Log")}
            </h3>

            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center shadow-soft">
                <FileText className="h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-base font-semibold">{t("pettyCash.noLogs", "No Petty Cash Logs")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("pettyCash.noLogsDesc", "Petty cash additions and expenditures will appear here once recorded.")}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="py-3 px-4 text-left rtl:text-right font-semibold text-muted-foreground w-36">{t("common.date", "Date")}</th>
                        <th className="py-3 px-4 text-center font-semibold text-muted-foreground w-28">{t("pettyCash.type", "Type")}</th>
                        <th className="py-3 px-4 text-left rtl:text-right font-semibold text-muted-foreground w-44">{t("moneyRequests.particulars", "Particulars")}</th>
                        <th className="py-3 px-4 text-left rtl:text-right font-semibold text-muted-foreground">{t("common.description", "Description")}</th>
                        <th className="py-3 px-4 text-right rtl:text-left font-semibold text-muted-foreground w-36">{t("common.amount", "Amount")}</th>
                        <th className="py-3 px-4 text-left rtl:text-right font-semibold text-muted-foreground w-44">{t("pettyCash.loggedBy", "Logged By")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map((tx: any) => (
                        <tr key={tx._id} className="hover:bg-accent/10 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {tx.type === "add" ? (
                              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold px-2 rounded-md">
                                {t("pettyCash.cashIn", "Cash In")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-semibold px-2 rounded-md">
                                {t("pettyCash.cashOut", "Cash Out")}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground max-w-[180px] truncate" title={tx.particulars || "—"}>
                            {tx.particulars || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-foreground max-w-xs truncate" title={tx.description}>
                            {tx.description || "—"}
                          </td>
                          <td className={`py-3.5 px-4 text-right rtl:text-left font-semibold tabular-nums ${tx.type === "add" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {tx.type === "add" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{tx.performedByName || "Finance User"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
