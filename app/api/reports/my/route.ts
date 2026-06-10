import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import { canEditDailyReport } from "@/lib/report-edit-access";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const team = url.searchParams.get("team");

  await connectToDatabase();
  const filter: Record<string, unknown> = { employeeId: user.id };
  if (team) {
    filter.teamName = team;
  }
  if (date) {
    const day = new Date(date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.reportDate = { $gte: day, $lt: nextDay };
  }

  const reports = await DailyReport.find(filter).sort({ createdAt: -1 }).lean();
  const data = reports.map((report) => ({
    ...report,
    canEdit: canEditDailyReport(report, user)
  }));

  return NextResponse.json({ success: true, data });
}
