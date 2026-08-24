import { redirect } from "next/navigation";

export default async function LegacyReportManagerConsolidatedDetailPage({
  params
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  redirect(`/consolidated-reports/${date}`);
}
