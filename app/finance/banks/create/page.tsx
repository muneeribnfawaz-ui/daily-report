import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFinanceReport, canAccessBanksAndPettyCash } from "@/lib/permissions";
import { BankCreateForm } from "./bank-create-form";

export default async function CreateBankPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  
  if (!canAccessBanksAndPettyCash(user) || !canCreateFinanceReport(user)) {
    redirect("/finance/banks");
  }

  return (
    <AppShell title="Add Bank Account" role={user.role}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Add Bank Account"
          description="Register a new bank account for your active workspace."
          backButton={
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
              <Link href="/finance/banks" title="Back" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <BankCreateForm />
      </div>
    </AppShell>
  );
}
