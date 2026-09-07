import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAddUserForm } from "@/components/admin/admin-add-user-form";
import { ManagerAddUserForm } from "@/components/admin/manager-add-user-form";
import type { SessionUser } from "@/lib/types";

export function UserCreateScreen({ currentUser }: { currentUser: SessionUser }) {
  const plainUser = currentUser ? JSON.parse(JSON.stringify(currentUser)) : currentUser;
  const isAdmin = plainUser?.role === "admin";
  const isManagerScoped = plainUser?.role === "ceo" || plainUser?.role === "team_lead" || plainUser?.role === "hod" || plainUser?.role === "report_manager";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Details</CardTitle>
      </CardHeader>
      <CardContent>{isAdmin ? <AdminAddUserForm /> : isManagerScoped ? <ManagerAddUserForm currentUser={plainUser} /> : null}</CardContent>
    </Card>
  );
}
