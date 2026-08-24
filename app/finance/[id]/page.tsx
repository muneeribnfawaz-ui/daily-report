import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canEditFinanceReport, canApproveFinanceReport, canForwardFinanceReport } from "@/lib/permissions";
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

  let report: any;
  try {
    report = await FinanceReport.findById(id).lean();
  } catch {
    notFound();
  }

  if (!report) notFound();

  const canApprove = canApproveFinanceReport(user);
  const canForward = canForwardFinanceReport(user);
  const canEdit = canEditFinanceReport(user);

  const serializedReport = {
    _id: String(report._id),
    reportDate: (report.reportDate as Date).toISOString(),
    submittedByName: (report.submittedByName as string) || "",
    expenses: Array.isArray(report.expenses) ? report.expenses : [],
    receipts: Array.isArray(report.receipts) ? report.receipts : [],
    payments: Array.isArray(report.payments) ? report.payments : [],
    bankBalances: Array.isArray(report.bankBalances) ? report.bankBalances : [],
    cashBalance: report.cashBalance || { pettyCash: 0, total: 0 },
    nextDayApprovals: Array.isArray(report.nextDayApprovals) ? report.nextDayApprovals : [],
    summary: report.summary || { totalExpenses: 0, totalReceipts: 0, totalPayments: 0, bankBalance: 0, pettyCashBalance: 0, description: "" },
    exchangeRate: (report.exchangeRate as number) || 0,
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
          canForward={canForward}
          canEdit={canEdit}
        />
      </div>
    </AppShell>
  );
}
