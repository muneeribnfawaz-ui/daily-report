import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";
import { getTeamNamesByDepartment } from "@/lib/team-types";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { canViewFinanceReport } from "@/lib/permissions";

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
  return new Date(d.setDate(diff));
}

function toPeriodKey(value: Date | string | null | undefined, period: "daily" | "weekly" | "monthly") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  if (period === "monthly") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  }
  if (period === "weekly") {
    const startOfWeek = getStartOfWeek(date);
    return startOfWeek.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "team_member" && user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo" && (user.role as string) !== "finance_team")) {
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
    const team = url.searchParams.get("team");
    const mine = url.searchParams.get("mine") === "true";

    const requestedGroup = (() => {
      const g = url.searchParams.get("group");
      return g === "finance" ? "finance" : g === "operations" ? "operations" : g === "all" ? "all" : undefined;
    })();

    const periodStr = url.searchParams.get("period");
    const period = periodStr === "weekly" || periodStr === "monthly" ? periodStr : "daily";

    const userPrimaryDepartment = user.departments && user.departments.length > 0 ? user.departments[0].name : undefined;

    const rawDeptParam = url.searchParams.get("department");
    const normalizeDepartment = (val?: string | null) => {
      if (!val) return "All";
      const trimmed = val.trim();
      const lower = trimmed.toLowerCase();
      if (lower === "all" || lower === "all enrolled depts" || lower === "all departments") {
        return "All";
      }
      return trimmed;
    };
    const department = normalizeDepartment(rawDeptParam);

    const isFinanceRequested = requestedGroup === "finance" || department === "Finance";
    const isUserEnrolledInFinance = user.departments?.some((d) => (typeof d === "string" ? d : d.name) === "Finance");

    if (isFinanceRequested) {
      const isAuthorizedForFinance =
        user.role === "ceo" ||
        user.role === "admin" ||
        (user.role as string) === "finance_team" ||
        Boolean(isUserEnrolledInFinance) ||
        canViewFinanceReport(user);

      if (!isAuthorizedForFinance) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
    }

    const userDepts = user.departments?.map((d: any) => typeof d === "string" ? d : d.name) || [];
    if (
      user.role === "report_manager" &&
      department !== "All" &&
      userDepts.length > 0 &&
      !userDepts.includes(department)
    ) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to access consolidated reports for this department." },
        { status: 403 }
      );
    }

    if (!date) {
      const conditions: Record<string, any>[] = [];
      if (workspaceId && workspaceId !== "all") {
        conditions.push({ workspaceId });
      }

      if (user.role === "team_member" || mine) {
        conditions.push({ employeeId: user.id });
      } else if (user.role === "ceo") {
        const hodUsers = await db.user.findMany({
          where: { role: "hod", isDeleted: false },
          select: { id: true }
        });
        const hodUserIds = hodUsers.map((u) => String(u.id));

        const memberFilter: Record<string, any> = {
          role: "hod",
          status: "active",
          isActive: true
        };
        if (workspaceId && workspaceId !== "all") {
          memberFilter.workspaceId = workspaceId;
        }
        const hodMembers = await db.workspaceMember.findMany({ where: memberFilter, select: { userId: true } });
        for (const m of hodMembers) {
          if (m.userId) hodUserIds.push(String(m.userId));
        }

        const uniqueHodUserIds = Array.from(new Set(hodUserIds));
        conditions.push({ employeeId: { in: uniqueHodUserIds } });
      } else {
        const visibleEmployeeIds = await getVisibleReportEmployeeIds({
          ...user,
          workspaceId: workspaceId || user.workspaceId
        });
        if (visibleEmployeeIds) {
          conditions.push({ employeeId: { in: visibleEmployeeIds } });
        }
      }

      if (department !== "All") {
        const deptTeams = await getTeamNamesByDepartment(department);
        const deptUsers = await db.user.findMany({
          where: {
            isDeleted: false,
            workspaceMembers: {
              some: {
                OR: [
                  { departments: { some: { name: department } } },
                  { teamName: department },
                  { teamNames: { has: department } },
                  { teamName: { in: deptTeams } },
                  { teamNames: { hasSome: deptTeams } }
                ]
              }
            }
          },
          select: { id: true, workspaceMembers: { select: { teamName: true, teamNames: true } } }
        });

        const matchedTeamNames = Array.from(new Set([department, ...deptTeams]));
        conditions.push({ teamName: { in: matchedTeamNames } });
      } else {
        const isUserInFinance = userDepts.includes("Finance");
        if (user.role !== "ceo" && user.role !== "hod" && user.role !== "admin" && (!isUserInFinance || user.role !== "report_manager")) {
          const financeMembers = await db.workspaceMember.findMany({
            where: { departments: { some: { name: "Finance" } }, isActive: true, status: "active" },
            select: { userId: true }
          });
          const financeUserIds = financeMembers.map((m) => m.userId);
          if (financeUserIds.length > 0) {
            conditions.push({ employeeId: { notIn: financeUserIds } });
          }
        }
      }

      if (team && team !== "All") {
        conditions.push({ teamName: team });
      }

      const filter = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { AND: conditions };

      const reports = await db.dailyReport.findMany({ where: filter, orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }] });
      const byDate = new Map<
        string,
        {
          date: string;
          reportCount: number;
          teamNames: Set<string>;
        }
      >();

      for (const report of reports) {
        const key = toPeriodKey(report.reportDate, period);
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
      workspaceId,
      period,
      team ?? undefined,
      mine
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
