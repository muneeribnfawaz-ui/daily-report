"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader, DashboardPanel, DashboardStatCard } from "@/components/dashboard/ui";
import { FinanceDashboardSection } from "@/components/finance/finance-dashboard-section";
import Link from "next/link";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useTranslation } from "@/lib/i18n";

type AdminDashboardStats = {
  totalUsers: number;
  totalEmployees: number;
  totalReports: number;
  activeUsers: number;
};

export function AdminDashboardContent() {
  const { t } = useTranslation();
  const selectedCompanyId = useSelectedCompany();

  const { data: stats, isLoading } = useQuery<AdminDashboardStats>({
    queryKey: ["admin-dashboard-stats", selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId
        ? `/api/admin/dashboard/stats?workspaceId=${encodeURIComponent(selectedCompanyId)}`
        : "/api/admin/dashboard/stats";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch admin stats");
      const json = await res.json();
      return json.data as AdminDashboardStats;
    }
  });

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow={t("dashboard.systemControlEyebrow")}
        title={t("dashboard.adminTitle")}
        description={t("dashboard.adminDesc")}
        actions={
          <>
            <Button asChild>
              <Link href="/admin/users">{t("dashboard.manageUsers")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/team-types">{t("dashboard.teamTypes")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/settings">{t("dashboard.systemSettings")}</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label={t("dashboard.totalUsers")}
          value={isLoading ? "..." : String(stats?.totalUsers ?? 0)}
          delta={t("dashboard.companyUsers")}
          accent="from-primary/20 via-primary/5 to-transparent"
        />
        <DashboardStatCard
          label={t("dashboard.totalEmployees")}
          value={isLoading ? "..." : String(stats?.totalEmployees ?? 0)}
          delta={t("dashboard.teamMembers")}
          accent="from-primaryDark/20 via-primaryDark/5 to-transparent"
        />
        <DashboardStatCard
          label={t("dashboard.totalReports")}
          value={isLoading ? "..." : String(stats?.totalReports ?? 0)}
          delta={t("dashboard.totalSubmitted")}
          accent="from-success/20 via-success/5 to-transparent"
        />
        <DashboardStatCard
          label={t("dashboard.activeUsers")}
          value={isLoading ? "..." : String(stats?.activeUsers ?? 0)}
          delta={t("dashboard.activeAccounts")}
          accent="from-warning/20 via-warning/5 to-transparent"
        />
      </div>

      {/* Finance Section */}
      <div className="border-t pt-6">
        <FinanceDashboardSection />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel title={t("dashboard.platformHealth")} subtitle={t("dashboard.platformHealthSubtitle")}>
          <div className="space-y-4">
            {[
              [t("dashboard.authService"), t("dashboard.healthy"), "text-success"],
              [t("dashboard.mongoDbConnection"), t("dashboard.healthy"), "text-success"],
              [t("dashboard.pdfGeneration"), t("dashboard.queued"), "text-warning"],
              [t("dashboard.auditLogging"), t("dashboard.healthy"), "text-success"]
            ].map(([label, status, color]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <div className="font-medium">{label}</div>
                <div className={color}>{status}</div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title={t("dashboard.adminPriorities")} subtitle={t("dashboard.adminPrioritiesSubtitle")}>
          <div className="space-y-3">
            {[
              t("dashboard.addOrSuspendUsers"),
              t("dashboard.reviewLockedReports"),
              t("dashboard.inspectAuditTrails"),
              t("dashboard.updateSystemSettings")
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3">
                <div className="text-sm">{item}</div>
                <Badge variant="soft">{t("dashboard.open")}</Badge>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
