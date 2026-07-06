import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAddUserForm } from "@/components/admin/admin-add-user-form";
import { ManagerAddUserForm } from "@/components/admin/manager-add-user-form";
import type { SessionUser } from "@/lib/types";

export function UserCreateScreen({ currentUser }: { currentUser: SessionUser }) {
  const isAdmin = currentUser.role === "admin" || currentUser.role === "ceo";
  const isManagerScoped = currentUser.role === "team_lead" || currentUser.role === "hod";

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Details</CardTitle>
      </CardHeader>
      <CardContent>{isAdmin ? <AdminAddUserForm /> : isManagerScoped ? <ManagerAddUserForm /> : null}</CardContent>
    </Card>
  );
}
