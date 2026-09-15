"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ROLE_LABELS, normalizeRole } from "@/lib/constants";
import { formatDisplayName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

type UserDetail = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  teamName?: string;
  teamNames?: string[];
  managerName?: string;
  empID?: string;
  phone?: string;
  secondaryPhone?: string;
  dateOfBirth?: string;
  status?: string;
};

export function UserViewScreen({
  userId,
  backHref = "/admin/users",
  editHref = `/admin/users/${userId}/edit`,
  reportHref
}: {
  userId: string;
  backHref?: string;
  editHref?: string;
  reportHref?: string;
}) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ["user-view", userId],
    queryFn: async () => {
      const response = await api.get(`/api/users/${userId}`);
      return response.data?.data as UserDetail;
    }
  });

  const user = query.data;
  const rawTeamList = user?.teamNames?.length ? user.teamNames : user?.teamName ? [user.teamName] : [];
  const teamLabel = rawTeamList.length ? rawTeamList.map(formatDisplayName).join(", ") : "—";
  const resolvedRole = user?.role ? normalizeRole(user.role) ?? "team_member" : "team_member";
  const localizedRole = t(`roles.${resolvedRole}`) || ROLE_LABELS[resolvedRole];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href={backHref as Route} title={t("common.back")} aria-label={t("common.back")}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <div>
            <CardTitle>{t("users.titleDetails")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t("users.descDetails")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={editHref as Route}>{t("common.edit")}</Link>
          </Button>
          {user?.role !== "ceo" && reportHref && (
            <Button asChild>
              <Link href={reportHref as Route}>{t("common.viewReport")}</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : query.isError || !user ? (
          <div className="text-sm text-danger">{t("common.somethingWentWrong")}</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="soft">{user.name ?? "—"}</Badge>
              <Badge variant="outline">{user.email ?? "—"}</Badge>
              <Badge variant="outline">{localizedRole}</Badge>
              <Badge variant="outline">{user.status ?? "—"}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("common.email")}</div>
                <div className="mt-1 text-sm font-medium">{user.email ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("common.phone")}</div>
                <div className="mt-1 text-sm font-medium">{user.phone ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("common.secondaryPhone")}</div>
                <div className="mt-1 text-sm font-medium">{user.secondaryPhone ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("common.dateOfBirth")}</div>
                <div className="mt-1 text-sm font-medium">{user.dateOfBirth ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("common.team")}</div>
                <div className="mt-1 text-sm font-medium">{teamLabel}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("common.manager")}</div>
                <div className="mt-1 text-sm font-medium">{user.managerName ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("users.empId")}</div>
                <div className="mt-1 text-sm font-medium">{user.empID ?? "—"}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
