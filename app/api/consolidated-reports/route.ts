import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";
import User from "@/models/User";
import DailyReport from "@/models/DailyReport";
import { getFinanceTeamInternalNames, getTeamNamesByDepartment } from "@/lib/team-types";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { canViewFinanceReport } from "@/lib/permissions";

function toDateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo" && user.role !== "finance_team")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    let workspaceId = url.searchParams.get("workspaceId");
    if (!workspaceId) {
      workspaceId = user.workspaceId;
    }
    if (!workspaceId) {
      return NextResponse.json({ success: false, message: "Workspace ID is required" }, { status: 400 });
    }

    const date = url.searchParams.get("date");

    const requestedGroup = (() => {
      const g = url.searchParams.get("group");
      return g === "finance" ? "finance" : g === "operations" ? "operations" : g === "all" ? "all" : undefined;
    })();

    // Resolve user's primary department
    const userPrimaryDepartment = user.departments && user.departments.length > 0 ? user.departments[0].name : undefined;

    let department = url.searchParams.get("department") ?? undefined;
    if (!department && userPrimaryDepartment && user.role !== "admin" && user.role !== "ceo") {
      department = userPrimaryDepartment;
    }

    const isFinanceRequested = requestedGroup === "finance" || department === "Finance";
    const isUserEnrolledInFinance = user.departments?.some((d) => d.name === "Finance");

    if (isFinanceRequested) {
      const isAuthorizedForFinance =
        user.role === "ceo" ||
        user.role === "admin" ||
        user.role === "hod" ||
        user.role === "finance_team" ||
        Boolean(isUserEnrolledInFinance) ||
        canViewFinanceReport(user);

      if (!isAuthorizedForFinance) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
    }

    await connectToDatabase();

    if (!date) {
      const conditions: Record<string, any>[] = [{ workspaceId }];
      const visibleEmployeeIds = await getVisibleReportEmployeeIds(user);
      if (visibleEmployeeIds) {
        conditions.push({ employeeId: { $in: visibleEmployeeIds } });
      }

      if (department && department !== "All") {
        const deptTeams = await getTeamNamesByDepartment(department);
        const deptUsers = await User.find(
          {
            isDeleted: { $ne: true },
            $or: [
              { "departments.name": department },
              { department: department },
              { teamName: department },
              { teamNames: department },
              { teamName: { $in: deptTeams } },
              { teamNames: { $in: deptTeams } }
            ]
          },
          { _id: 1, teamName: 1, teamNames: 1 }
        ).lean();

        const deptUserIds = deptUsers.map((u) => String(u._id));
        const deptUserTeamNames = deptUsers.flatMap((u) => [u.teamName, ...(u.teamNames ?? [])]).filter(Boolean) as string[];

        const matchedTeamNames = Array.from(
          new Set([department, ...deptTeams, ...deptUserTeamNames])
        );

        const deptConditions: Record<string, any>[] = [
          { teamName: { $in: matchedTeamNames } },
          { department: department }
        ];
        if (deptUserIds.length > 0) {
          deptConditions.push({ employeeId: { $in: deptUserIds } });
        }

        conditions.push({ $or: deptConditions });
      } else {
        if (user.role !== "ceo" && user.role !== "hod" && user.role !== "admin") {
          const financeTeams = await getFinanceTeamInternalNames();
          if (financeTeams.length > 0) {
            conditions.push({ teamName: { $nin: financeTeams } });
          }
        }
      }

      const filter = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { $and: conditions };

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
        if (!key) continue;
        const current = byDate.get(key) ?? { date: key, reportCount: 0, teamNames: new Set<string>() };
        current.reportCount += 1;
        if (report.teamName) {
          current.teamNames.add(report.teamName);
        }
        byDate.set(key, current);
      }

      const summary = Array.from(byDate.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((item) => ({
          date: item.date,
          reportCount: item.reportCount,
          teamNames: Array.from(item.teamNames).sort()
        }));

      return NextResponse.json({
        success: true,
        data: summary,
        meta: { userDepartment: userPrimaryDepartment, activeDepartment: department ?? "All" }
      });
    }

    const detail = await getConsolidatedReportDetail(
      date,
      user.name,
      user.role,
      user.teamName,
      requestedGroup,
      department,
      workspaceId
    );

    return NextResponse.json({
      success: true,
      data: {
        date,
        reportCount: detail.reportCount,
        teamCount: detail.teamCount,
        teamGroups: detail.teamGroups
      },
      meta: { userDepartment: userPrimaryDepartment, activeDepartment: department ?? "All" }
    });
  } catch (error) {
    console.error("Error in GET /api/consolidated-reports:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    );
  }
}
