"use client";

import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ReportList } from "@/components/reports/report-list";
import { useTranslation } from "@/lib/i18n";

export function AdminReportsContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow={t("reports.eyebrowOversight")}
        title={t("nav.reports")}
        description={t("reports.adminReportsDesc")}
      />
      <ReportList endpoint="/api/reports" title="reports" detailBaseHref="/admin/reports" />
    </div>
  );
}
