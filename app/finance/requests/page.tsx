import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canCreateMoneyRequest, canForwardFinanceReport, canApproveFinanceReport } from "@/lib/permissions";
import db from "@/lib/db";
import { Plus } from "lucide-react";
import { MoneyRequestsTable, type RequestItemData } from "@/components/finance/money-requests-table";

export default async function MoneyRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceReport(user)) redirect("/dashboard");

  const canForward = canForwardFinanceReport(user);
  const canApprove = canApproveFinanceReport(user) || user.role === "admin";
  const canCreateRequest = canCreateMoneyRequest(user);

  const requestsList: RequestItemData[] = [];

  // Fetch exclusively from dedicated MoneyRequest database table
  const moneyRequests = await db.moneyRequest.findMany({
    orderBy: { reportDate: "desc" },
    take: 100
  });

  for (const item of moneyRequests) {
    requestsList.push({
      reportId: String(item.id),
      reportDate: item.reportDate ? new Date(item.reportDate).toISOString() : new Date().toISOString(),
      submittedBy: item.submittedBy,
      submittedByName: item.submittedByName || "Finance User",
      particulars: item.particulars || "N/A",
      amountINR: item.amountINR || 0,
      amountRiyal: item.amountSAR || 0,
      reason: item.description || "",
      priority: item.priority || "medium",
      bankName: item.bankName || "",
      revisedAmountINR: item.revisedAmountINR ?? null,
      revisedAmountSAR: item.revisedAmountSAR ?? null,
      revisionReference: item.revisionReference || "",
      approval: item.status || "pending",
      reviewedBy: item.reviewedBy || null,
      reviewedByName: item.reviewedByName || "",
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt).toISOString() : null,
      reviewComment: item.reviewComment || ""
    });
  }

  return (
    <AppShell title="Money Requests" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Money Requests"
          description="View and manage next-day money approval requests submitted by the finance department."
          actions={
            canCreateRequest ? (
              <Button asChild className="shadow-sm">
                <Link href="/finance/requests/create">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Request
                </Link>
              </Button>
            ) : undefined
          }
        />

        <MoneyRequestsTable
          initialRequests={requestsList}
          canCreateRequest={canCreateRequest}
          userRole={user.role}
          canForward={canForward}
          canApprove={canApprove}
        />
      </div>
    </AppShell>
  );
}
