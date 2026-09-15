import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canCreateMoneyRequest, canForwardFinanceReport, canApproveFinanceReport } from "@/lib/permissions";
import { Plus } from "lucide-react";
import { MoneyRequestsTable } from "@/components/finance/money-requests-table";

export default async function MoneyRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceReport(user)) redirect("/dashboard");

  const canForward = canForwardFinanceReport(user);
  const canApprove = canApproveFinanceReport(user) || user.role === "admin";
  const canCreateRequest = canCreateMoneyRequest(user);

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
          canCreateRequest={canCreateRequest}
          userRole={user.role}
          canForward={canForward}
          canApprove={canApprove}
        />
      </div>
    </AppShell>
  );
}
