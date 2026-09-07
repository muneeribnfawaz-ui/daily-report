import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CompanyCreateScreen } from "@/components/admin/company-create-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function AdminCreateCompanyPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  return (
    <AppShell title="Create Company" role={user.role}>
      <CompanyCreateScreen
        backHref="/admin/companies"
        successHref="/admin/companies"
      />
    </AppShell>
  );
}
