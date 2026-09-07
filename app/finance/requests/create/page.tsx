import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canCreateMoneyRequest } from "@/lib/permissions";
import { FinanceReportForm } from "@/components/finance/finance-report-form";

export default async function MoneyRequestCreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canCreateMoneyRequest(user)) redirect("/finance/requests");

  return (
    <AppShell title="Create Money Request" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Create Money Request"
          description="Enter next-day money approval items. All fields accept numeric values in INR with automatic SAR conversion."
        />
        <FinanceReportForm mode="create" formType="money-request" />
      </div>
    </AppShell>
  );
}
