import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";
import DailyReport from "@/models/DailyReport";

function toDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  await connectToDatabase();

  if (!date) {
    const reports = await DailyReport.find({}).sort({ reportDate: -1, createdAt: -1 }).lean();
    const byDate = new Map<
      string,
      {
        date: string;
        reportCount: number;
        teamNames: Set<string>;
      }
    >();

    for (const report of reports) {
      const key = toDateKey(report.reportDate);
      const current = byDate.get(key) ?? { date: key, reportCount: 0, teamNames: new Set<string>() };
      current.reportCount += 1;
      current.teamNames.add(report.teamName);
      byDate.set(key, current);
    }

    const summary = Array.from(byDate.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((item) => ({
        date: item.date,
        reportCount: item.reportCount,
        teamNames: Array.from(item.teamNames).sort()
      }));

    return NextResponse.json({ success: true, data: summary });
  }

  const detail = await getConsolidatedReportDetail(date, user.name, user.role, user.teamName);

  return NextResponse.json({
    success: true,
    data: {
      date,
      reportCount: detail.reportCount,
      teamCount: detail.teamCount,
      teamGroups: detail.teamGroups
    }
  });
}
