import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CompanyEditScreen } from "@/components/admin/company-edit-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function AdminEditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);

  return (
    <AppShell title="Edit Company" role={user.role}>
      <CompanyEditScreen
        companyId={id}
        backHref="/admin/companies"
        successHref="/admin/companies"
      />
    </AppShell>
  );
}
