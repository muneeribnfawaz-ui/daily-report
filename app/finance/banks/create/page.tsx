import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
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
        />
        <BankCreateForm />
      </div>
    </AppShell>
  );
}
