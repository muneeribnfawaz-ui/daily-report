import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canCreateMoneyRequest, canEditFinanceReport } from "@/lib/permissions";
import db from "@/lib/db";
import { FinanceReportForm } from "@/components/finance/finance-report-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function MoneyRequestEditPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  
  const hasBasePermission = canCreateMoneyRequest(user) || canEditFinanceReport(user);
  if (!hasBasePermission) {
    redirect("/finance/requests");
  }

  const { id } = await params;

  let moneyRequest: any;
  try {
    moneyRequest = await db.moneyRequest.findUnique({
      where: { id }
    });
    if (!moneyRequest) {
      moneyRequest = await db.moneyRequest.findFirst({
        where: { financeReportId: id }
      });
    }
  } catch (error) {
    console.error("Error fetching money request for edit:", error);
    notFound();
  }

  if (!moneyRequest) notFound();

  // Permission check
  const canEdit = canEditFinanceReport(user) || canCreateMoneyRequest(user) || String(moneyRequest.submittedBy) === user.id;
  if (!canEdit) {
    redirect("/finance/requests");
  }

  // Status check: cannot edit if status is not pending or if linked report was forwarded to CEO
  let isLinkedReportForwarded = false;
  if (moneyRequest.financeReportId) {
    const linkedReport = await db.financeReport.findUnique({
      where: { id: moneyRequest.financeReportId }
    });
    if (linkedReport && linkedReport.status !== "pending") {
      isLinkedReportForwarded = true;
    }
  }

  if (moneyRequest.status !== "pending" || isLinkedReportForwarded) {
    redirect("/finance/requests");
  }

  const serializedReport = {
    _id: moneyRequest.id,
    reportDate: moneyRequest.reportDate ? new Date(moneyRequest.reportDate).toISOString().slice(0, 10) : "",
    expenses: [],
    receipts: [],
    payments: [],
    bankBalances: [],
    cashBalance: { pettyCash: 0, total: 0 },
    nextDayApprovals: [
      {
        particulars: moneyRequest.particulars || "",
        description: moneyRequest.description || "",
        priority: (moneyRequest.priority as any) || "medium",
        amountINR: moneyRequest.amountINR || 0,
        amountSAR: moneyRequest.amountSAR || 0,
        bankName: moneyRequest.bankName || "",
        bankAccountId: null,
        paymentMode: "" as const,
        revisedAmountINR: moneyRequest.revisedAmountINR ?? null,
        revisedAmountSAR: moneyRequest.revisedAmountSAR ?? null,
        revisionReference: moneyRequest.revisionReference || "",
        approval: (moneyRequest.status as any) || "pending"
      }
    ],
    summary: { totalExpenses: 0, totalReceipts: 0, totalPayments: 0, bankBalance: 0, pettyCashBalance: 0, description: "" },
    exchangeRate: 0,
  };

  return (
    <AppShell title="Edit Money Request" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Edit Money Request"
          description="Modify your pending money approval request. Amounts are specified in INR with automatic SAR conversion."
        />
        <FinanceReportForm mode="edit" formType="money-request" initialData={serializedReport} />
      </div>
    </AppShell>
  );
}
