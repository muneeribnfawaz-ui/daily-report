"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAddUserForm } from "@/components/admin/admin-add-user-form";
import { useTranslation } from "@/lib/i18n";

export function AdminAddUserPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{t("users.addUser")}</CardTitle>
          <div className="text-sm text-muted-foreground">{t("users.descAdd")}</div>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? t("common.close") : t("users.addUser")}
        </Button>
      </CardHeader>
      {open ? (
        <CardContent>
          <AdminAddUserForm />
        </CardContent>
      ) : null}
    </Card>
  );
}
