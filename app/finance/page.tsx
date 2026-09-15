import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canCreateFinanceReport } from "@/lib/permissions";
import { Plus } from "lucide-react";
import { FinanceReportsTable } from "@/components/finance/finance-reports-table";

export default async function FinanceListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceReport(user)) redirect("/dashboard");

  const canCreate = canCreateFinanceReport(user);

  return (
    <AppShell title="Finance Reports" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Finance Reports"
          description="Manage daily finance reports, track revenue and expenses, and monitor cash flow."
          actions={
            canCreate ? (
              <Button asChild className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold shadow-md">
                <Link href="/finance/create">
                  <Plus className="mr-2 h-4 w-4" />
                  New Report
                </Link>
              </Button>
            ) : undefined
          }
        />

        <FinanceReportsTable canCreate={canCreate} />
      </div>
    </AppShell>
  );
}
