"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAddUserForm } from "@/components/admin/admin-add-user-form";
import { ManagerAddUserForm } from "@/components/admin/manager-add-user-form";
import type { SessionUser } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

export function UserCreateScreen({ currentUser }: { currentUser: SessionUser }) {
  const { t } = useTranslation();
  const plainUser = currentUser ? JSON.parse(JSON.stringify(currentUser)) : currentUser;
  const isAdmin = plainUser?.role === "admin";
  const isManagerScoped = plainUser?.role === "ceo" || plainUser?.role === "team_lead" || plainUser?.role === "hod" || plainUser?.role === "report_manager";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("users.employeeDetails")}</CardTitle>
      </CardHeader>
      <CardContent>{isAdmin ? <AdminAddUserForm /> : isManagerScoped ? <ManagerAddUserForm currentUser={plainUser} /> : null}</CardContent>
    </Card>
  );
}
