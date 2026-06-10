import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom") ?? url.searchParams.get("date");
  const dateTo = url.searchParams.get("dateTo") ?? url.searchParams.get("date");
  const date = dateFrom ?? dateTo;

  if (!date) {
    return NextResponse.json({ success: false, message: "date is required" }, { status: 400 });
  }

  const data = await getConsolidatedReportDetail(date, user.name, user.role, user.teamName);
  return NextResponse.json({ success: true, data });
}
