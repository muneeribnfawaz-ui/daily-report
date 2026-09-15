"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardStatCard, DashboardPanel } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { formatDisplayName } from "@/lib/utils";
import { Loader2, Wallet, Clock } from "lucide-react";
import { decryptPayload } from "@/lib/crypto";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useTranslation } from "@/lib/i18n";

type FinanceDashboardData = {
  todayRevenue: number;
  todayExpenses: number;
  netProfitLoss: number;
  closingCashBalance: number;
  closingCashBalanceSAR: number;
  pendingApprovals: number;
  lastReportDate: string | null;
  lastReportStatus: string | null;
  hasTodayReport: boolean;
};

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

export function FinanceDashboardSection() {
  const { t } = useTranslation();
  const selectedCompanyId = useSelectedCompany();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["finance-dashboard", selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId
        ? `/api/finance-reports/dashboard?workspaceId=${encodeURIComponent(selectedCompanyId)}`
        : "/api/finance-reports/dashboard";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      const payloadData = json.encryptedData ? await decryptPayload(json.encryptedData) : json.data;
      return payloadData as FinanceDashboardData;
    },
    staleTime: 60_000
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("finance.financeOverview")}</h2>
        </div>
        <div className="flex items-center justify-center rounded-xl border bg-card p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 rtl:mr-3 rtl:ml-0 text-sm text-muted-foreground">{t("finance.loadingFinanceData")}</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">{t("finance.financeOverview")}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label={t("finance.todaysRevenue")}
          value={data.hasTodayReport ? formatCurrency(data.todayRevenue) : "—"}
          delta={data.hasTodayReport ? t("common.today") : t("finance.noReportYet")}
          accent="from-success/20 via-success/5 to-transparent"
        />
        <DashboardStatCard
          label={t("finance.todaysExpenses")}
          value={data.hasTodayReport ? formatCurrency(data.todayExpenses) : "—"}
          delta={data.hasTodayReport ? t("common.today") : t("finance.noReportYet")}
          accent="from-danger/20 via-danger/5 to-transparent"
        />
        <DashboardStatCard
          label={t("finance.netProfitLoss")}
          value={data.hasTodayReport ? formatCurrency(data.netProfitLoss) : "—"}
          delta={data.netProfitLoss >= 0 ? t("finance.profit") : t("finance.loss")}
          accent={data.netProfitLoss >= 0 ? "from-success/20 via-success/5 to-transparent" : "from-danger/20 via-danger/5 to-transparent"}
          tone={data.netProfitLoss >= 0 ? "text-success" : "text-danger"}
        />
        <DashboardStatCard
          label={t("finance.closingBalance")}
          value={data.hasTodayReport ? formatCurrency(data.closingCashBalance) : "—"}
          delta={data.hasTodayReport ? `≈ SAR ${Math.round(data.closingCashBalanceSAR).toLocaleString()}` : "—"}
          accent="from-primary/20 via-primary/5 to-transparent"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardPanel title={t("finance.pendingApprovals")} subtitle={t("finance.pendingApprovalsSubtitle")}>
          <div className="flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">
                {data.pendingApprovals === 0
                  ? t("finance.noPendingApprovals")
                  : t("finance.reportsPending", { count: data.pendingApprovals })}
              </span>
            </div>
            {data.pendingApprovals > 0 && (
              <Badge className="rounded-full bg-warning/10 text-warning border-warning/30 px-3 py-1">
                {data.pendingApprovals}
              </Badge>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title={t("finance.lastReport")} subtitle={t("finance.lastReportSubtitle")}>
          {data.lastReportDate ? (
            <div className="flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{formatDate(data.lastReportDate)}</div>
                <div className="text-xs text-muted-foreground">{t("finance.lastSubmittedFinanceReport")}</div>
              </div>
              <Badge
                variant={data.lastReportStatus === "approved" ? "soft" : "outline"}
                className="capitalize"
              >
                {data.lastReportStatus === "approved" ? t("reports.approved") : data.lastReportStatus === "rejected" ? t("reports.rejected") : data.lastReportStatus === "pending" ? t("reports.pending") : formatDisplayName(data.lastReportStatus || "pending")}
              </Badge>
            </div>
          ) : (
            <div className="rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              {t("finance.noFinanceReportsYet")}
            </div>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
