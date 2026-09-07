import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canCreateFinanceReport, canAccessBanksAndPettyCash } from "@/lib/permissions";
import db from "@/lib/db";
import { decryptDbField } from "@/lib/crypto/db-encryption";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Wallet, Plus } from "lucide-react";
import { BankDirectoryTable } from "@/components/finance/bank-directory-table";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export default async function BankListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessBanksAndPettyCash(user)) redirect("/dashboard");

  const filter: any = {};

  if (user.role !== "admin") {
    const memberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      select: { workspaceId: true }
    });
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (user.workspaceId && user.workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(user.workspaceId) ? user.workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else {
    if (user.workspaceId && user.workspaceId !== "all") {
      filter.workspaceId = user.workspaceId;
    }
  }

  const banks = await db.bankAccount.findMany({
    where: filter,
    orderBy: { bankName: "asc" }
  });
  
  const workspaceIds = Array.from(new Set(banks.map((b: any) => b.workspaceId)));
  const reportsByWorkspace: Record<string, any[]> = {};

  for (const wId of workspaceIds) {
    const reports = await db.financeReport.findMany({
      where: { workspaceId: wId as string },
      include: { items: true }
    });
    reportsByWorkspace[wId as string] = reports;
  }

  const processedBanks = banks.map((bank: any) => {
    let plainAccount = "";
    try {
      plainAccount = decryptDbField(bank.accountNumber || "");
    } catch {
      plainAccount = bank.accountNumber || "";
    }
    const len = plainAccount.length;
    let masked = "";
    if (len > 4) {
      masked = "X".repeat(len - 4) + plainAccount.slice(-4);
    } else if (bank.account_last_4) {
      masked = "XXXX" + bank.account_last_4;
    } else {
      masked = plainAccount ? plainAccount : "XXXX";
    }
    
    let displayName = bank.bankName;
    if (bank.account_last_4) displayName += ` - ${bank.account_last_4}`;

    const rawBankName = bank.bankName.trim().toLowerCase();
    const fullDisplayName = displayName.trim().toLowerCase();
    const workspaceReports = reportsByWorkspace[bank.workspaceId] || [];

    let netTransactions = 0;
    for (const report of workspaceReports) {
      for (const item of report.items) {
        if (item.type === "next_day") continue;
        const itemBankName = (item.bankName || "").trim().toLowerCase();
        let isMatch = itemBankName === fullDisplayName || itemBankName === rawBankName;
        if (!isMatch && item.type === "payment" && item.paymentMode === "transfer_to_cash") {
          if (itemBankName === fullDisplayName || itemBankName === rawBankName) {
            isMatch = true;
          }
        }

        if (isMatch) {
          if (item.type === "receipt") {
            netTransactions += item.amountINR || 0;
          } else if (item.type === "expense" || item.type === "payment") {
            netTransactions -= item.amountINR || 0;
          }
        }
      }
    }

    const currentBalance = (bank.openingBalance || 0) + netTransactions;

    return { ...bank, maskedAccountNumber: masked, currentBalance };
  });

  const canCreate = canCreateFinanceReport(user);

  return (
    <AppShell title="Bank List" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Bank Accounts"
          description="View all registered bank accounts in your organization."
          actions={
            canCreate ? (
              <Button asChild>
                <Link href="/finance/banks/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bank
                </Link>
              </Button>
            ) : undefined
          }
        />

        {banks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold">No Bank Accounts Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate
                ? "Get started by adding your first bank account."
                : "No bank accounts are registered in the active workspace."}
            </p>
            {canCreate && (
              <Button asChild className="mt-4">
                <Link href="/finance/banks/create">Add Bank Account</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-card shadow-soft border-indigo-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Registered Accounts</span>
                    <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                      {banks.length}
                    </h2>
                  </div>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-lg font-semibold tracking-tight mt-6">Account Directory</h3>
            <BankDirectoryTable banks={processedBanks} userRole={user.role} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
