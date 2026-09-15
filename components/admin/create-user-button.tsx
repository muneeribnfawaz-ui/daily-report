"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

export function CreateUserButton({
  href = "/report-manager/users/create"
}: {
  href?: Route;
}) {
  const { t } = useTranslation();
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  if (!currentUser || (currentUser.role !== "team_lead" && currentUser.role !== "hod" && currentUser.role !== "admin" && currentUser.role !== "ceo")) {
    return null;
  }

  let targetHref = href;
  if (currentUser.role === "admin") targetHref = "/admin/users/create";
  else if (currentUser.role === "ceo") targetHref = "/ceo/users/create";
  else if (currentUser.role === "hod") targetHref = "/hod/users/create";
  else if (currentUser.role === "team_lead") targetHref = "/team-lead/users/create";

  return (
    <Button asChild variant="outline">
      <Link href={targetHref as Route}>{t("users.addUser")}</Link>
    </Button>
  );
}
