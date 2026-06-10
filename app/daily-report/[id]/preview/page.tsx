import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { MyReportPreview } from "@/components/reports/my-report-preview";
import { getCurrentUser } from "@/lib/auth";

export default async function DailyReportPreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="Report Preview" role={user.role} sidebarVariant="daily-report">
      <MyReportPreview reportId={id} />
    </AppShell>
  );
}
