import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canCreateFinanceReport } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db";
import FinanceReport from "@/models/FinanceReport";
import { Plus, FileText, ArrowRight } from "lucide-react";

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

  await connectToDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reports = await FinanceReport.find()
    .sort({ reportDate: -1 })
    .limit(50)
    .lean() as Array<Record<string, any>>;

  const canCreate = canCreateFinanceReport(user);

  return (
    <AppShell title="Finance Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Finance Reports"
          description="Manage daily finance reports, track revenue and expenses, and monitor cash flow."
          actions={
            canCreate ? (
              <Button asChild>
                <Link href="/finance/create">
                  <Plus className="mr-2 h-4 w-4" />
                  New Finance Report
                </Link>
              </Button>
            ) : undefined
          }
        />

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold">No Finance Reports</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate
                ? "Get started by creating your first finance report."
                : "No finance reports have been submitted yet."}
            </p>
            {canCreate && (
              <Button asChild className="mt-4">
                <Link href="/finance/create">Create Report</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
            {/* Table Header */}
            <div className="hidden border-b bg-muted/30 px-4 py-3 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted By</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Total Income</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Status</div>
              <div className="w-10" />
            </div>

            {/* Table Rows */}
            {reports.map((report) => (
              <Link
                key={String(report._id)}
                href={`/finance/${String(report._id)}`}
                className="flex flex-col gap-2 border-b px-4 py-3.5 transition-colors hover:bg-accent/20 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4 last:border-b-0"
              >
                <div className="font-medium text-sm">
                  {formatDate(report.reportDate as Date)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {report.submittedByName as string}
                </div>
                <div className="text-sm font-semibold tabular-nums text-right">
                  {formatCurrency((report.totalIncome as number) || 0)}
                </div>
                <div className="flex sm:justify-center">
                  <StatusBadge status={(report.status as string) || "pending"} />
                </div>
                <div className="flex justify-end">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
