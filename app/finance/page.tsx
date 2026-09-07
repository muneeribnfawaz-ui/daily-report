import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canCreateFinanceReport, canEditFinanceReport } from "@/lib/permissions";
import db from "@/lib/db";
import { Plus, FileText } from "lucide-react";
import { FinanceEditButton } from "@/components/finance/finance-edit-button";

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
  const variants: Record<string, { className: string; label: string }> = {
    pending: {
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
      label: "Pending"
    },
    approved: {
      className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      label: "Approved"
    },
    rejected: {
      className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
      label: "Rejected"
    }
  };
  const v = variants[status] || variants.pending;
  return <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.className}`}>{v.label}</Badge>;
}

export default async function FinanceListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceReport(user)) redirect("/dashboard");

  const reports = await db.financeReport.findMany({
    orderBy: { reportDate: "desc" },
    take: 50,
    include: {
      bankBalances: true
    }
  });

  const canCreate = canCreateFinanceReport(user);
  const canEdit = canEditFinanceReport(user);

  return (
    <AppShell title="Finance Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Finance Reports"
          description="Manage daily finance reports, track revenue and expenses, and monitor cash flow."
          actions={
            canCreate ? (
              <Button asChild className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold shadow-md">
                <Link href="/finance/create">
                  <Plus className="mr-2 h-4 w-4" />
                  New Report
                </Link>
              </Button>
            ) : undefined
          }
        />

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold text-textPrimary">No Finance Reports</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate
                ? "Get started by creating your first finance report."
                : "No finance reports have been submitted yet."}
            </p>
            {canCreate && (
              <Button asChild className="mt-4 bg-primary hover:bg-primaryDark text-primary-foreground font-bold shadow-md">
                <Link href="/finance/create">Create Report</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
            {/* Table Header */}
            <div className="hidden border-b bg-muted/40 px-4 py-3 sm:grid sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr] sm:items-center sm:gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary">Date</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary">Submitted By</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary text-right">Total Income</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary text-right">Total Expense</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-textPrimary text-center">Status</div>
            </div>

            {/* Table Rows */}
            {reports.map((report) => {
              const totalIncome = ((report as any).summary?.totalReceipts ?? report.bankBalances?.reduce((sum, b) => (b.bankName === "Cash" ? sum : sum + (b.receipts || 0)), 0)) || 0;
              const totalExpense = report.bankBalances?.reduce((sum, b) => sum + (b.payments || 0), 0) || 0;
              return (
                <div
                  key={String(report.id)}
                  className="group relative flex flex-col gap-2 border-b px-4 py-3.5 transition-colors hover:bg-accent/10 sm:grid sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr] sm:items-center sm:gap-4 last:border-b-0"
                >
                  <Link href={`/finance/${String(report.id)}`} className="absolute inset-0 z-0" aria-label="View Report" />
                  
                  <div className="font-medium text-sm pointer-events-none relative z-0 text-textPrimary">
                    {formatDate(report.reportDate as Date)}
                  </div>
                  <div className="text-sm font-semibold text-foreground pointer-events-none relative z-0 flex items-center gap-1.5">
                    <span>{report.submittedByName as string || "Finance User"}</span>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-right pointer-events-none relative z-0 text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalIncome)}
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-right pointer-events-none relative z-0 text-rose-600 dark:text-rose-400">
                    {formatCurrency(totalExpense)}
                  </div>
                  <div className="flex sm:justify-center pointer-events-none relative z-0">
                    <StatusBadge status={(report.status as string) || "pending"} />
                  </div>

                  {/* Mobile breakdown */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 sm:hidden">
                    <span>By: <strong className="text-foreground">{report.submittedByName as string}</strong></span>
                    <span>Income: <strong className="text-emerald-600">{formatCurrency(totalIncome)}</strong></span>
                    <span>Expense: <strong className="text-rose-600">{formatCurrency(totalExpense)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
