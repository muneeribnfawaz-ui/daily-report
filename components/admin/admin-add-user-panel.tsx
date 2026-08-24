"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAddUserForm } from "@/components/admin/admin-add-user-form";

export function AdminAddUserPanel() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Add User</CardTitle>
          <div className="text-sm text-muted-foreground">Create staff profiles with company roles and team links.</div>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Add User"}
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
