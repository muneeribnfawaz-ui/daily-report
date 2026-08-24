import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFinanceReport } from "@/lib/permissions";
import { FinanceReportForm } from "@/components/finance/finance-report-form";

export default async function FinanceCreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canCreateFinanceReport(user)) redirect("/finance");

  return (
    <AppShell title="New Finance Report" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="New Finance Report"
          description="Enter today's financial data. All fields accept numeric values in INR. Totals are calculated automatically."
        />
        <FinanceReportForm mode="create" />
      </div>
    </AppShell>
  );
}
