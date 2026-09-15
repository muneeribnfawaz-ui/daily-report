"use client";

import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { AdminUserList } from "@/components/admin/user-list";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export function AdminUsersContent({ isCeoView }: { isCeoView: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow={t("users.eyebrowAccessControl")}
        title={isCeoView ? t("users.ceos") : t("users.users")}
        description={
          isCeoView
            ? t("users.ceoManagementDesc")
            : t("users.userManagementDesc")
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={isCeoView ? "/admin/users/create?role=ceo" : "/admin/users/create"}>
                {isCeoView ? t("users.addCeo") : t("users.addUser")}
              </Link>
            </Button>
            {!isCeoView && (
              <Button asChild variant="outline">
                <Link href="/admin/team-types">{t("nav.teamTypes")}</Link>
              </Button>
            )}
          </div>
        }
      />
      <AdminUserList />
    </div>
  );
}
