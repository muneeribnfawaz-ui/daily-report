import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { canAccessBanksAndPettyCash } from "@/lib/permissions";
import { PettyCashClient } from "@/components/finance/petty-cash-client";

export default async function PettyCashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessBanksAndPettyCash(user)) redirect("/dashboard");

  return (
    <AppShell title="Petty Cash" role={user.role}>
      <PettyCashClient userRole={user.role} />
    </AppShell>
  );
}
