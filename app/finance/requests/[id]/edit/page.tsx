import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canCreateMoneyRequest, canEditFinanceReport } from "@/lib/permissions";
import db from "@/lib/db";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";
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

  const isAuthorized = await isWorkspaceAuthorizedForUser(user, moneyRequest.workspaceId);
  if (!isAuthorized) notFound();

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
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/finance/requests" title="Back" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <FinanceReportForm mode="edit" formType="money-request" initialData={serializedReport} />
      </div>
    </AppShell>
  );
}
