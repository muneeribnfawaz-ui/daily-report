import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canEditFinanceReport, canApproveFinanceReport } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db";
import FinanceReport from "@/models/FinanceReport";
import { FinanceReportDetail } from "@/components/finance/finance-report-detail";

type PageProps = { params: Promise<{ id: string }> };

export default async function FinanceDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceReport(user)) redirect("/dashboard");

  const { id } = await params;
  await connectToDatabase();

  let report;
  try {
    report = await FinanceReport.findById(id).lean();
  } catch {
    notFound();
  }

  if (!report) notFound();

  const canApprove = canApproveFinanceReport(user);
  const canEdit = canEditFinanceReport(user);

  const serializedReport = {
    _id: String(report._id),
    reportDate: (report.reportDate as Date).toISOString(),
    submittedByName: (report.submittedByName as string) || "",
    openingBalance: (report.openingBalance as number) || 0,
    cashReceived: (report.cashReceived as number) || 0,
    cardSales: (report.cardSales as number) || 0,
    onlinePayments: (report.onlinePayments as number) || 0,
    expenses: (report.expenses as number) || 0,
    refunds: (report.refunds as number) || 0,
    pettyCash: (report.pettyCash as number) || 0,
    bankDeposit: (report.bankDeposit as number) || 0,
    closingCashBalance: (report.closingCashBalance as number) || 0,
    totalIncome: (report.totalIncome as number) || 0,
    totalExpenses: (report.totalExpenses as number) || 0,
    netBalance: (report.netBalance as number) || 0,
    exchangeRate: (report.exchangeRate as number) || 0,
    closingCashBalanceSAR: (report.closingCashBalanceSAR as number) || 0,
    totalIncomeSAR: (report.totalIncomeSAR as number) || 0,
    totalExpensesSAR: (report.totalExpensesSAR as number) || 0,
    netBalanceSAR: (report.netBalanceSAR as number) || 0,
    status: (report.status as string) || "pending",
    approvedByName: (report.approvedByName as string) || "",
    approvedAt: report.approvedAt ? (report.approvedAt as Date).toISOString() : undefined,
    rejectionReason: (report.rejectionReason as string) || "",
    createdAt: (report.createdAt as Date).toISOString()
  };

  return (
    <AppShell title="Finance Report" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Finance Report Details"
          description="View the complete financial report with INR and SAR amounts."
        />
        <FinanceReportDetail
          report={serializedReport}
          canApprove={canApprove}
          canEdit={canEdit}
        />
      </div>
    </AppShell>
  );
}
