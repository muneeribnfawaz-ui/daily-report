import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import {
  canViewFinanceReport,
  canForwardFinanceReport,
  canApproveFinanceReport
} from "@/lib/permissions";
import db from "@/lib/db";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";
import { MoneyRequestDetail } from "@/components/finance/money-request-detail";

type PageProps = { params: Promise<{ id: string }> };

export default async function MoneyRequestDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceReport(user)) redirect("/dashboard");

  const { id } = await params;

  let moneyRequest: any = null;
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
    console.error("Error fetching money request detail:", error);
    notFound();
  }

  if (!moneyRequest) notFound();

  const isAuthorized = await isWorkspaceAuthorizedForUser(user, moneyRequest.workspaceId);
  if (!isAuthorized) notFound();

  const bankBalances = await db.moneyRequestBankBalance.findMany({
    where: { moneyRequestId: moneyRequest.id }
  });

  const canForward = canForwardFinanceReport(user);
  const canApprove = canApproveFinanceReport(user) || user.role === "admin";

  const serializedRequest = {
    id: String(moneyRequest.id),
    reportDate: moneyRequest.reportDate ? new Date(moneyRequest.reportDate).toISOString() : new Date().toISOString(),
    submittedBy: moneyRequest.submittedBy,
    submittedByName: moneyRequest.submittedByName || "Finance User",
    particulars: moneyRequest.particulars || "N/A",
    description: moneyRequest.description || "",
    amountINR: moneyRequest.amountINR || 0,
    amountSAR: moneyRequest.amountSAR || 0,
    priority: moneyRequest.priority || "medium",
    bankName: moneyRequest.bankName || "",
    revisedAmountINR: moneyRequest.revisedAmountINR ?? null,
    revisedAmountSAR: moneyRequest.revisedAmountSAR ?? null,
    revisionReference: moneyRequest.revisionReference || "",
    status: moneyRequest.status || "pending",
    financeReportId: moneyRequest.financeReportId || null,
    reviewedBy: moneyRequest.reviewedBy || null,
    reviewedByName: moneyRequest.reviewedByName || "",
    reviewedAt: moneyRequest.reviewedAt ? new Date(moneyRequest.reviewedAt).toISOString() : null,
    reviewComment: moneyRequest.reviewComment || "",
    createdAt: moneyRequest.createdAt ? new Date(moneyRequest.createdAt).toISOString() : new Date().toISOString(),
    bankBalances: bankBalances.map((b) => ({
      id: b.id,
      bankName: b.bankName,
      openingBalance: b.openingBalance
    }))
  };

  return (
    <AppShell title="Money Request Detail" role={user.role}>
      <MoneyRequestDetail
        moneyRequest={serializedRequest}
        userRole={user.role}
        currentUserId={user.id}
        canForward={canForward}
        canApprove={canApprove}
      />
    </AppShell>
  );
}
