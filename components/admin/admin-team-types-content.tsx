"use client";

import { DashboardPageHeader } from "@/components/dashboard/ui";
import { TeamTypesManager } from "@/components/admin/team-types-manager";
import { useTranslation } from "@/lib/i18n";

export function AdminTeamTypesContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow={t("teamTypes.eyebrowSettings")}
        title={t("nav.teamTypes")}
        description={t("teamTypes.pageDesc")}
      />
      <TeamTypesManager />
    </div>
  );
}
