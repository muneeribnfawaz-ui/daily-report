import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ReportDetailScreen } from "@/components/reports/report-detail-screen";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/permissions";

export default async function CeoReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);

  return (
    <AppShell title="Report Details" role={user.role}>
      <ReportDetailScreen reportId={id} backHref="/ceo/reports" />
    </AppShell>
  );
}
