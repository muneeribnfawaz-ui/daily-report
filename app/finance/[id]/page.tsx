import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canEditFinanceReport, canApproveFinanceReport, canForwardFinanceReport } from "@/lib/permissions";
import db from "@/lib/db";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";
import { FinanceReportDetail } from "@/components/finance/finance-report-detail";

type PageProps = { params: Promise<{ id: string }> };

export default async function FinanceDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceReport(user)) redirect("/dashboard");

  const { id } = await params;
  
  let report: any;
  try {
    report = await db.financeReport.findUnique({
      where: { id },
      include: {
        items: true,
        bankBalances: true,
        statusHistory: true
      }
    });
  } catch (error) {
    console.error("Error fetching finance report details:", error);
    notFound();
  }

  if (!report) notFound();

  const isAuthorized = await isWorkspaceAuthorizedForUser(user, report.workspaceId);
  if (!isAuthorized) notFound();

  const canApprove = canApproveFinanceReport(user);
  const canForward = canForwardFinanceReport(user);
  const canEdit = canEditFinanceReport(user);

  const txs = report.items || [];
  const mapTx = (t: any) => ({
    ...t,
    _id: t.id,
    bankAccountId: null,
    bankName: t.bankName || "-"
  });
  
  const expenses = txs.filter((t: any) => t.type === "expense").map(mapTx);
  const receipts = txs.filter((t: any) => t.type === "receipt").map(mapTx);
  const payments = txs.filter((t: any) => t.type === "payment").map(mapTx);

  const totalExpenses = expenses.reduce((sum: number, item: any) => sum + (Number(item.amountINR) || 0), 0);
  const totalReceipts = receipts.reduce((sum: number, item: any) => sum + (Number(item.amountINR) || 0), 0);
  const totalPayments = payments.reduce((sum: number, item: any) => sum + (Number(item.amountINR) || 0), 0);
  const bankBalancesList = report.bankBalances || [];
  const bankBalance = bankBalancesList.reduce((sum: number, b: any) => sum + (Number(b.closingBalance) || 0), 0);
  
  // Try to extract cash closing balance from bank balances if it exists
  const cashObj = bankBalancesList.find((b: any) => b.bankName === "Cash");
  const pettyCashBalance = cashObj ? (Number(cashObj.closingBalance) || 0) : 0;

  const serializedReport = {
    _id: report.id,
    reportDate: report.reportDate ? new Date(report.reportDate).toISOString() : "",
    submittedByName: report.submittedByName || "",
    expenses,
    receipts,
    payments,
    bankBalances: bankBalancesList,
    cashBalance: { pettyCash: pettyCashBalance, total: pettyCashBalance },
    nextDayApprovals: [], // Temporarily hardcoded until schema supports it
    summary: {
      totalExpenses,
      totalReceipts,
      totalPayments,
      bankBalance,
      pettyCashBalance,
      description: report.description || (report.summary as any)?.description || ""
    },
    exchangeRate: report.exchangeRate || 0,
    status: report.status || "pending",
    approvedByName: report.approvedByName || "",
    approvedAt: report.approvedAt ? new Date(report.approvedAt).toISOString() : undefined,
    rejectionReason: report.rejectionReason || "",
    createdAt: report.createdAt ? new Date(report.createdAt).toISOString() : "",
    editAccessRequested: Boolean(report.editAccessRequested),
    editAccessRequestReason: report.editAccessRequestReason || "",
    editAccessGranted: Boolean(report.editAccessGranted)
  };

  return (
    <AppShell title="Finance Report" role={user.role}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Finance</div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
                <Link href="/finance" title="Back" aria-label="Back">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl text-textPrimary">Finance Report Details</h1>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground lg:text-base">View the complete financial report with INR and SAR amounts.</p>
          </div>
        </div>
        <FinanceReportDetail
          report={serializedReport}
          canApprove={canApprove}
          canForward={canForward}
          canEdit={canEdit}
          userRole={user.role}
        />
      </div>
    </AppShell>
  );
}
