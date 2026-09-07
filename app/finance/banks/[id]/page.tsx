import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canAccessBanksAndPettyCash } from "@/lib/permissions";
import db from "@/lib/db";
import { decryptDbField } from "@/lib/crypto/db-encryption";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, ArrowDownLeft, ArrowUpRight, Wallet, ExternalLink, Calendar } from "lucide-react";
import { BankStatementActions } from "@/components/finance/bank-statement-actions";

type PageProps = { params: Promise<{ id: string }> };

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(date: Date | string): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default async function BankStatementPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessBanksAndPettyCash(user)) redirect("/dashboard");

  const { id } = await params;

  const bank = await db.bankAccount.findUnique({
    where: { id }
  });

  if (!bank || bank.isDeleted) {
    notFound();
  }

  // Decrypt account number
  let plainAccount = "";
  try {
    plainAccount = decryptDbField(bank.accountNumber || "");
  } catch {
    plainAccount = bank.accountNumber || "";
  }
  const len = plainAccount.length;
  let maskedAccountNumber = "";
  if (len > 4) {
    maskedAccountNumber = "X".repeat(len - 4) + plainAccount.slice(-4);
  } else if (bank.account_last_4) {
    maskedAccountNumber = "XXXX" + bank.account_last_4;
  } else {
    maskedAccountNumber = plainAccount || "XXXX";
  }

  let displayName = bank.bankName;
  if (bank.account_last_4) displayName += ` - ${bank.account_last_4}`;

  // Fetch all finance reports for this workspace
  const reports = await db.financeReport.findMany({
    where: {
      workspaceId: bank.workspaceId
    },
    include: {
      items: true
    },
    orderBy: {
      reportDate: "asc"
    }
  });

  // Extract all transaction items for this bank
  const rawBankName = bank.bankName.trim().toLowerCase();
  const fullDisplayName = displayName.trim().toLowerCase();

  const statementItems: any[] = [];

  for (const report of reports) {
    for (const item of report.items) {
      if (item.type === "next_day") continue;

      const itemBankName = (item.bankName || "").trim().toLowerCase();

      // Match item if bankName matches fullDisplayName or rawBankName
      let isMatch = itemBankName === fullDisplayName || itemBankName === rawBankName;
      
      // If item is a transfer_to_cash payment, check if it originated from this bank
      if (!isMatch && item.type === "payment" && item.paymentMode === "transfer_to_cash") {
        if (itemBankName === fullDisplayName || itemBankName === rawBankName) {
          isMatch = true;
        }
      }

      if (isMatch) {
        statementItems.push({
          id: item.id,
          financeReportId: report.id,
          reportDate: report.reportDate,
          particulars: item.particulars,
          description: item.description,
          type: item.type, // 'receipt' | 'expense' | 'payment'
          paymentMode: item.paymentMode || "Bank",
          amountINR: item.amountINR,
          submittedByName: report.submittedByName
        });
      }
    }
  }

  // Include Initial Opening Balance as an initial row if non-zero
  if (bank.openingBalance && bank.openingBalance > 0) {
    statementItems.push({
      id: `initial-ob-${bank.id}`,
      financeReportId: null,
      reportDate: bank.createdAt || new Date(),
      particulars: "Initial Opening Balance",
      description: "Opening balance registered on account creation",
      type: "receipt",
      paymentMode: "Initial",
      amountINR: bank.openingBalance,
      isInitialOB: true
    });
  }

  // Sort statement items chronologically ascending
  statementItems.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

  // Calculate running balance and aggregated totals
  let runningBalance = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;

  const statementRows = statementItems.map((item) => {
    const isDeposit = item.type === "receipt";
    const amount = item.amountINR || 0;

    if (isDeposit) {
      if (!item.isInitialOB) totalDeposits += amount;
      runningBalance += amount;
    } else {
      totalWithdrawals += amount;
      runningBalance -= amount;
    }

    return {
      ...item,
      isDeposit,
      runningBalance
    };
  });

  // Reverse statementRows for descending order display (newest first)
  const displayRows = [...statementRows].reverse();

  return (
    <AppShell title={`Statement — ${displayName}`} role={user.role}>
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
            <Link href="/finance/banks">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Bank Accounts
            </Link>
          </Button>
          
          <DashboardPageHeader
            eyebrow="Finance"
            title={`${displayName} Statement`}
            description={`Account Statement & Transaction History for ${bank.bankName}`}
          />
        </div>

        <BankStatementActions
          bank={{
            ...bank,
            accountNumber: plainAccount,
            maskedAccountNumber,
            editReason: bank.editReason || undefined
          }}
          userRole={user.role}
        />

        {/* Account Meta Info Header Card */}
        <Card className="bg-card border-cardBorder shadow-soft">
          <CardContent className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Account Number</span>
                <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{maskedAccountNumber}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Branch Name</span>
                <p className="mt-1 text-base font-medium text-foreground">{bank.branchName || "-"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">IFSC Code</span>
                <p className="mt-1 text-base font-medium text-foreground">{bank.ifscCode || "-"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Product / Currency</span>
                <p className="mt-1 text-base font-medium text-foreground">{bank.product ? `${bank.product} (${bank.currency})` : bank.currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card shadow-soft border-slate-700/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Opening Balance</span>
                <div className="rounded-lg bg-slate-500/10 p-2 text-slate-400">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatCurrency(bank.openingBalance)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-soft border-emerald-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Credit (Cr.)</span>
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-emerald-500 tabular-nums">
                {formatCurrency(totalDeposits)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-soft border-rose-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Debit (Dr.)</span>
                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-rose-500 tabular-nums">
                {formatCurrency(totalWithdrawals)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-soft border-primary/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Current Balance</span>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-primary tabular-nums">
                {formatCurrency(runningBalance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History Statement Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">Statement History</h3>
            <span className="text-sm text-muted-foreground">{statementRows.length} transactions recorded</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Particulars & Description</th>
                    <th className="py-3 px-4 text-center font-semibold text-muted-foreground">Mode</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Credit (Cr.)</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Debit (Dr.)</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Balance</th>
                    <th className="py-3 px-4 text-center font-semibold text-muted-foreground">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No transactions recorded for this bank account yet.
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row) => (
                      <tr key={row.id} className="hover:bg-accent/10 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDate(row.reportDate)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">{row.particulars}</div>
                          {row.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center capitalize text-muted-foreground font-medium">
                          {row.paymentMode.replace(/_/g, " ")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-emerald-500">
                          {row.isDeposit ? formatCurrency(row.amountINR) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-rose-500">
                          {!row.isDeposit ? formatCurrency(row.amountINR) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold tabular-nums text-foreground">
                          {formatCurrency(row.runningBalance)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.financeReportId ? (
                            <Button asChild size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                              <Link href={`/finance/${row.financeReportId}`} title="View Finance Report">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
