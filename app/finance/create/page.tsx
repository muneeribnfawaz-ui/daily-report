import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/finance" title="Back" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <FinanceReportForm mode="create" />
      </div>
    </AppShell>
  );
}
