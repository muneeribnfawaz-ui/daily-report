import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { CompaniesManager } from "@/components/admin/companies-manager";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoCompaniesPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Companies Directory" role={user.role}>
      <div className="space-y-6">
        <div className="rounded-xl border border-cardBorder bg-card p-4 sm:p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon" className="shrink-0">
              <Link href={"/ceo/dashboard" as Route} title="Back to dashboard" aria-label="Back to dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Companies Directory</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                View and manage active business unit workspaces.
              </div>
            </div>
          </div>
        </div>

        <CompaniesManager />
      </div>
    </AppShell>
  );
}
