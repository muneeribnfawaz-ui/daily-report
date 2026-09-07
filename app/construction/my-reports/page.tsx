import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConstructionMyReportList } from "@/components/reports/construction-my-report-list";
import { getCurrentUser } from "@/lib/auth";
import { isInConstruction } from "@/lib/permissions";

export default async function ConstructionMyReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Ensure only authorized users can see this
  const isConstruction = isInConstruction(user);
  if (!isConstruction && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    redirect("/dashboard");
  }

  return (
    <AppShell title="My Construction Report" role={user.role} sidebarVariant="daily-report">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">My Report</div>
            <p className="mt-2 text-sm text-muted-foreground">View, edit, or delete construction reports created by you.</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/construction/create">Create Report</Link>
          </Button>
        </div>
        <ConstructionMyReportList />
      </div>
    </AppShell>
  );
}
