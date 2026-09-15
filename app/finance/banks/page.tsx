import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFinanceReport, canAccessBanksAndPettyCash } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BankDirectoryTable } from "@/components/finance/bank-directory-table";

export default async function BankListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessBanksAndPettyCash(user)) redirect("/dashboard");

  const canCreate = canCreateFinanceReport(user);

  return (
    <AppShell title="Bank Directory" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Bank Directory"
          description="Manage institutional bank accounts, view real-time closing balances, and request detail changes."
          actions={
            canCreate ? (
              <Button asChild className="shadow-sm">
                <Link href="/finance/banks/create">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Bank Account
                </Link>
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-4">
          <BankDirectoryTable userRole={user.role} />
        </div>
      </div>
    </AppShell>
  );
}
