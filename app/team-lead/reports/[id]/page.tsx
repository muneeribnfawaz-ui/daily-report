import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function TeamLeadReportDetailRedirectPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "team_lead") {
    redirect(`/reports/${id}`);
  }

  redirect(`/reports/${id}`);
}
