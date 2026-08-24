import { redirect } from "next/navigation";

export default async function LegacyAdminConsolidatedDetailPage({
  params
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  redirect(`/consolidated-reports/${date}`);
}
