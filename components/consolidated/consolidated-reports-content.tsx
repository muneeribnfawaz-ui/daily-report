"use client";

import { DashboardPageHeader } from "@/components/dashboard/ui";
import { ConsolidatedReportBrowser } from "@/components/consolidated/consolidated-report-browser";
import { useTranslation } from "@/lib/i18n";

export function ConsolidatedReportsContent({
  userPrimaryDept,
  enrolledDepartments,
  enrolledTeams,
  userRole
}: {
  userPrimaryDept?: string;
  enrolledDepartments: string[];
  enrolledTeams: string[];
  userRole: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow={t("consolidated.eyebrow")}
        title={t("nav.consolidatedReports")}
        description={t("consolidated.pageDesc")}
      />
      <ConsolidatedReportBrowser
        endpoint="/api/consolidated-reports"
        detailBaseHref="/consolidated-reports"
        userDepartment={userPrimaryDept}
        enrolledDepartments={enrolledDepartments}
        enrolledTeams={enrolledTeams}
        userRole={userRole}
      />
    </div>
  );
}
