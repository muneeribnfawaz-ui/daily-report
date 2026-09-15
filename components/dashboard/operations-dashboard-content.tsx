"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader, DashboardPanel, DashboardStatCard } from "@/components/dashboard/ui";
import Link from "next/link";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useTranslation } from "@/lib/i18n";

type OperationsDashboardData = {
  totalReportsToday: number;
  pendingReports: number;
  approvedReports: number;
  lockedReports: number;
  recentReports: Array<{
    _id: string;
    name: string;
    teamName: string;
    status: string;
    blockers?: string;
    requiredClarification?: string;
    pendingWork?: string;
  }>;
  operationalSnapshot: {
    consolidationReady: number;
    reportsWithBlockers: number;
    missingReports: number;
    pdfExports: number;
  };
};

export function OperationsDashboardContent() {
  const { t } = useTranslation();
  const selectedCompanyId = useSelectedCompany();

  const { data: sessionUser } = useQuery<any>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      return json.data;
    }
  });

  const userRole = sessionUser?.role;
  const isTm = userRole === "team_member";

  const { data, isLoading } = useQuery<OperationsDashboardData>({
    queryKey: ["operations-dashboard-stats", selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId
        ? `/api/dashboard/stats?workspaceId=${encodeURIComponent(selectedCompanyId)}`
        : "/api/dashboard/stats";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch operations dashboard stats");
      const json = await res.json();
      return json.data as OperationsDashboardData;
    }
  });

  const recentReports = data?.recentReports || [];
  const snapshot = data?.operationalSnapshot || {
    consolidationReady: 0,
    reportsWithBlockers: 0,
    missingReports: 0,
    pdfExports: 0
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow={isTm ? t("dashboard.operationsEyebrowStaff") : t("dashboard.operationsEyebrowManagement")}
        title={isTm ? t("dashboard.operationsTitleStaff") : t("dashboard.operationsTitleManagement")}
        description={isTm ? t("dashboard.operationsDescStaff") : t("dashboard.operationsDescManagement")}
        actions={
          isTm ? null : (
            <>
              {userRole !== "team_lead" && <CreateUserButton />}
              
              {userRole !== "team_lead" && (
                <Button asChild variant="outline">
                  <Link href="/daily-report/create">{t("dashboard.newDailyReport")}</Link>
                </Button>
              )}

              {userRole === "hod" && (
                <>
                  <Button asChild>
                    <Link href="/hod/reports">{t("dashboard.allReports")}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/finance">{t("nav.financeReport")}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/consolidated-reports">{t("nav.consolidatedReports")}</Link>
                  </Button>
                </>
              )}

              {userRole === "report_manager" && (
                <Button asChild>
                  <Link href="/reports">{t("dashboard.openReports")}</Link>
                </Button>
              )}

              {(userRole === "admin" || userRole === "ceo") && (
                <>
                  <Button asChild>
                    <Link href={userRole === "ceo" ? "/ceo/reports" : "/admin/reports"}>{t("dashboard.openReports")}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/consolidated-reports">{t("nav.consolidatedReports")}</Link>
                  </Button>
                </>
              )}
            </>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label={t("dashboard.totalReportsToday")}
          value={isLoading ? "..." : String(data?.totalReportsToday ?? 0)}
          delta={t("dashboard.todaysSubmissions")}
          accent="from-primary/20 via-primary/5 to-transparent"
        />
        <DashboardStatCard
          label={t("dashboard.pendingReports")}
          value={isLoading ? "..." : String(data?.pendingReports ?? 0)}
          delta={t("dashboard.awaitingReview")}
          accent="from-warning/20 via-warning/5 to-transparent"
        />
        <DashboardStatCard
          label={t("dashboard.approvedReports")}
          value={isLoading ? "..." : String(data?.approvedReports ?? 0)}
          delta={t("dashboard.approved")}
          accent="from-success/20 via-success/5 to-transparent"
        />
        <DashboardStatCard
          label={t("dashboard.lockedReports")}
          value={isLoading ? "..." : String(data?.lockedReports ?? 0)}
          delta={t("dashboard.finalized")}
          accent="from-cardBorder/20 via-cardBorder/5 to-transparent"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardPanel title={t("dashboard.reviewQueue")} subtitle={t("dashboard.reviewQueueSubtitle")}>
          <div className="space-y-3">
            {recentReports.length > 0 ? (
              recentReports.map((report) => {
                let note = report.pendingWork || report.blockers || report.requiredClarification || t("dashboard.awaitingReview");
                if (note.length > 45) note = note.substring(0, 45) + "...";
                return (
                  <div key={String(report._id)} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{report.name || t("dashboard.unknown")}</div>
                        <div className="text-sm text-muted-foreground">{report.teamName || t("dashboard.generalTeam")}</div>
                      </div>
                      <Badge variant={report.status === "approved" ? "soft" : "outline"}>
                        {report.status === "approved" ? t("reports.approved") : report.status === "rejected" ? t("reports.rejected") : report.status === "pending" ? t("reports.pending") : report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1).replace("_", " ") : t("dashboard.submitted")}
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">{note}</div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("dashboard.noReportsWaiting")}
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title={t("dashboard.operationalSnapshot")} subtitle={t("dashboard.operationalSnapshotSubtitle")}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [t("dashboard.consolidationReady"), String(snapshot.consolidationReady)],
              [t("dashboard.reportsWithBlockers"), String(snapshot.reportsWithBlockers)],
              [t("dashboard.missingReports"), String(snapshot.missingReports)],
              [t("dashboard.pdfExports"), String(snapshot.pdfExports)]
            ].map(([label, val]) => (
              <div key={label} className="rounded-2xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
                <div className="mt-3 text-2xl font-semibold">{val}</div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
