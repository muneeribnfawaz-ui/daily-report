import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";
import DailyReport from "@/models/DailyReport";
import { getFinanceTeamInternalNames, getTeamNamesByDepartment } from "@/lib/team-types";

function toDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  const requestedGroup = (() => {
    const g = url.searchParams.get("group");
    return g === "finance" ? "finance" : g === "operations" ? "operations" : g === "all" ? "all" : undefined;
  })();

  const department = url.searchParams.get("department") ?? undefined;

  // Finance consolidated reports are restricted to admin, ceo, and hod only.
  if (
    (requestedGroup === "finance" || department === "Finance") &&
    user.role !== "admin" &&
    user.role !== "ceo" &&
    user.role !== "hod"
  ) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  if (!date) {
    const filter: Record<string, any> = {};

    if (department && department !== "All") {
      const deptTeams = await getTeamNamesByDepartment(department);
      if (deptTeams.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      filter.teamName = { $in: deptTeams };
    } else {
      const financeTeams = await getFinanceTeamInternalNames();
      if (financeTeams.length > 0) {
        filter.teamName = { $nin: financeTeams };
      }
    }

    const reports = await DailyReport.find(filter).sort({ reportDate: -1, createdAt: -1 }).lean();
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

  const detail = await getConsolidatedReportDetail(
    date,
    user.name,
    user.role,
    user.teamName,
    requestedGroup,
    department
  );

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
