import DailyReport from "@/models/DailyReport";
import User from "@/models/User";
import db from "@/lib/db";
import { getActiveLeaveRequestsForRange, toInclusiveDateRange, type ActiveLeaveRequest } from "@/lib/leave-requests";
import type { ReportSheetEntry, ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { getActiveTeamTypeShowNameMap, getTeamNamesByDepartment } from "@/lib/team-types";
import { reportRelationsInclude } from "@/lib/report-mapper";

import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

function collectDescendantUserNames(
  users: Array<{ name?: string | null; managerName?: string | null }>,
  rootManagerName: string
) {
  const descendantNames = new Set<string>();
  const queue = [rootManagerName];

  while (queue.length) {
    const currentManager = queue.shift();
    if (!currentManager) continue;

    for (const user of users) {
      if (!user.name || !user.managerName) continue;
      if (user.managerName !== currentManager || descendantNames.has(user.name)) continue;

      descendantNames.add(user.name);
      queue.push(user.name);
    }
  }

  return descendantNames;
}

function getVisibleUserIds(
  users: Array<{
    id?: unknown;
    _id?: unknown;
    name?: string | null;
    managerName?: string | null;
    teamName?: string | null;
    teamNames?: string[] | null;
  }>,
  currentUser: { name?: string | null; teamName?: string | null }
) {
  const visibleUserNames = collectDescendantUserNames(
    users as Array<{ name?: string | null; managerName?: string | null }>,
    currentUser.name ?? ""
  );
  if (currentUser.name) {
    visibleUserNames.add(currentUser.name);
  }

  const visibleUserIds = new Set<string>();
  for (const user of users) {
    const userId = user.id || user._id;
    if (!userId || !user.name) continue;

    const isDescendant = visibleUserNames.has(user.name);
    const isSameTeam =
      Boolean(currentUser.teamName) &&
      (user.teamName === currentUser.teamName || user.teamNames?.includes(currentUser.teamName ?? ""));

    if (isDescendant || isSameTeam) {
      visibleUserIds.add(String(userId));
    }
  }

  return Array.from(visibleUserIds);
}

function resolveTeamName(user: {
  teamName?: string | null;
  teamNames?: string[] | null;
}) {
  const candidate = [user.teamName, ...(user.teamNames ?? [])].find((value) => value?.trim() && value.trim() !== "undefined");
  return candidate?.trim() || "MIF Tech Members";
}

import { formatDisplayName } from "@/lib/utils";

function getTeamDisplayName(teamName: string, teamTypeShowNameMap: Record<string, string>) {
  if (!teamName.trim() || teamName.toLowerCase() === "undefined") return "MIF Tech Members";
  const mapped = teamTypeShowNameMap[teamName] ?? teamName;
  return formatDisplayName(mapped);
}

function shouldIncludeVisibleUser(userRole: string | null | undefined, currentRole: string) {
  if (currentRole === "admin" || currentRole === "hod" || currentRole === "ceo") {
    return true;
  }

  if (currentRole === "team_lead") {
    return !["admin", "hod", "report_manager"].includes(userRole ?? "");
  }

  return false;
}

export function toDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export async function getConsolidatedReportDetail(
  date: string,
  userName: string,
  role: string,
  teamName?: string | null,
  reportGroup?: "finance" | "operations" | "all",
  department?: string,
  workspaceId?: string,
  period: string = "daily",
  teamFilter?: string,
  mine?: boolean
) {
  const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap();

  // Fetch members who are in the Finance department
  const financeMembers = await db.workspaceMember.findMany({
    where: { departments: { some: { name: "Finance" } }, isActive: true, status: "active" },
    select: { userId: true }
  });
  const financeUserIdSet = new Set(financeMembers.map((m) => m.userId));

  let departmentFilterUserIds: Set<string> | null = null;
  let departmentTeamNamesSet: Set<string> | null = null;

  if (department && department !== "All") {
    const departmentTeamNames = await getTeamNamesByDepartment(department);
    const deptMembers = await db.workspaceMember.findMany({
      where: {
        status: "active",
        isActive: true,
        OR: [
          { departments: { some: { name: department } } },
          { departments: { some: { name: { in: departmentTeamNames } } } }
        ]
      },
      select: { userId: true, departments: true }
    });

    const deptUserIds = deptMembers.map((m) => m.userId);
    const deptUserTeamNames = deptMembers.flatMap((m) => m.departments.map(d => d.name)).filter(Boolean);

    departmentFilterUserIds = new Set(deptUserIds);
    departmentTeamNamesSet = new Set([department, ...departmentTeamNames, ...deptUserTeamNames]);
  }

  const allUsers = await db.user.findMany();

  const userRoleById = new Map<string, string | null>();
  for (const user of allUsers) {
    if (!user.id) continue;
    userRoleById.set(String(user.id), user.role ?? null);
  }

  const currentUserObj = (await db.user.findFirst({ where: { name: userName } })) as any;
  const currentUserDepts = currentUserObj?.departments ?? [];
  const resolvedVisibleIds = await getVisibleReportEmployeeIds({
    id: currentUserObj ? String(currentUserObj.id || currentUserObj._id) : "",
    name: userName,
    role,
    teamName: teamName ?? null,
    departments: currentUserDepts
  });

  const isManagementOrDeptView =
    role === "admin" ||
    role === "ceo" ||
    role === "hod" ||
    role === "report_manager" ||
    Boolean(department && department !== "All");

  const conditions: Record<string, any>[] = [];

  if (teamFilter && teamFilter !== "All") {
    conditions.push({ teamName: teamFilter });
  }

  if (workspaceId && workspaceId !== "all") {
    conditions.push({ workspaceId });
  }

  // Handle visible employee IDs based on role
  let visibleEmployeeIds: string[] = [];

  if (mine && currentUserObj) {
    const currentId = String(currentUserObj.id || currentUserObj._id);
    visibleEmployeeIds = [currentId];
    conditions.push({ employeeId: currentId });
  } else if (role === "ceo") {
    // Consolidated reports for CEO are strictly generated from Head of Department (role === 'hod') reports or HOD-verified reports.
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
    visibleEmployeeIds = uniqueHodUserIds;

    const hodConditions: Record<string, any>[] = [
      { verificationLevel: "hod" }
    ];
    if (uniqueHodUserIds.length > 0) {
      hodConditions.push({ employeeId: { in: uniqueHodUserIds } });
      hodConditions.push({ reviewedBy: { in: uniqueHodUserIds } });
    }

    conditions.push({ OR: hodConditions });
  } else if (role === "hod") {
    const memberFilter: Record<string, any> = {
      role: "team_lead",
      status: "active",
      isActive: true
    };
    if (workspaceId && workspaceId !== "all") {
      memberFilter.workspaceId = workspaceId;
    }
    const targetMembers = await db.workspaceMember.findMany({ where: memberFilter, select: { userId: true } });
    const targetUserIds = targetMembers.map((m) => String(m.userId));
    if (currentUserObj && (currentUserObj.id || currentUserObj._id)) {
      targetUserIds.push(String(currentUserObj.id || currentUserObj._id));
    }
    visibleEmployeeIds = targetUserIds;
    if (!visibleEmployeeIds.length) {
      return {
        date,
        reportCount: 0,
        teamCount: 0,
        teamGroups: []
      };
    }
    conditions.push({ employeeId: { in: targetUserIds } });
  } else if (resolvedVisibleIds && !isManagementOrDeptView) {
    visibleEmployeeIds = resolvedVisibleIds;
    if (!visibleEmployeeIds.length) {
      return {
        date,
        reportCount: 0,
        teamCount: 0,
        teamGroups: []
      };
    }
    conditions.push({ employeeId: { in: visibleEmployeeIds } });
  } else {
    visibleEmployeeIds = allUsers.map((user) => String(user.id)).filter(Boolean);
  }

  let day = new Date(date);
  if (period === "weekly") {
    if (typeof date === "string" && date.includes("-W")) {
      const parts = date.split("-W");
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const week = parseInt(parts[1], 10);
        const d = new Date(year, 0, 1 + (week - 1) * 7);
        const dDay = d.getDay();
        const diff = d.getDate() - dDay + (dDay === 0 ? -6 : 1);
        day = new Date(d.setDate(diff));
      }
    } else {
      const d = day.getDay();
      const diff = day.getDate() - d + (d === 0 ? -6 : 1);
      day = new Date(day.setDate(diff));
    }
    day.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    day = new Date(day.getFullYear(), day.getMonth(), 1);
  }

  const nextDay = new Date(day);
  if (period === "weekly") {
    nextDay.setDate(nextDay.getDate() + 7);
  } else if (period === "monthly") {
    nextDay.setMonth(nextDay.getMonth() + 1);
  } else {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  conditions.push({ reportDate: { gte: day, lt: nextDay } });

  // Finance is decoupled and explicitly excluded from standard consolidated multi-department reports UNLESS Finance is explicitly selected.
  if (department !== "Finance" && financeUserIdSet.size > 0) {
    conditions.push({ employeeId: { notIn: Array.from(financeUserIdSet) } });
  }

  // If a department is specified, only include reports for users or teams in that department
  if (departmentTeamNamesSet && departmentFilterUserIds) {
    conditions.push({
      OR: [
        { employeeId: { in: Array.from(departmentFilterUserIds).map(String) } },
        { teamName: { in: Array.from(departmentTeamNamesSet) } }
      ]
    });
  }

  const filter = conditions.length <= 1 ? conditions[0] ?? {} : { AND: conditions };
  const reports = await db.dailyReport.findMany({ 
    where: filter, 
    orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    include: reportRelationsInclude
  }) as any;

  const userMap = new Map<string, { role?: string | null }>();
  if (reports.length) {
    const employeeIds: string[] = Array.from(new Set(reports.map((report: any) => String(report.employeeId))));
    const users = await db.user.findMany({ where: { id: { in: employeeIds } } });
    for (const item of users) {
      userMap.set(String(item.id), { role: item.role });
    }
  }

  // For leave requests, query up to the end of the period
  const endOfPeriodStr = new Date(nextDay.getTime() - 86400000).toISOString().slice(0, 10);
  const leaveRequests = await getActiveLeaveRequestsForRange({
    employeeIds: visibleEmployeeIds,
    dateFrom: date,
    dateTo: endOfPeriodStr
  });

  // Filter out Finance leave requests unless Finance department is explicitly requested, and any not in the selected department
  const filteredLeaveRequests = leaveRequests.filter((lr) => {
    if (department !== "Finance" && financeUserIdSet.has(lr.employeeId)) return false;
    if (
      departmentTeamNamesSet &&
      departmentFilterUserIds &&
      !departmentTeamNamesSet.has(lr.teamName) &&
      !departmentFilterUserIds.has(lr.employeeId)
    ) {
      return false;
    }
    return true;
  });
  const leaveByEmployeeId = new Map<string, ActiveLeaveRequest>();
  const leaveMembersByTeam = new Map<
    string,
    Array<{
      employeeId: string;
      name: string;
      leaveDuration: ActiveLeaveRequest["leaveDuration"];
      leaveHalf?: ActiveLeaveRequest["leaveHalf"];
      status: ActiveLeaveRequest["status"];
      reviewedByName?: string | null;
    }>
  >();
  const notSharedMembersByTeam = new Map<string, Array<{ employeeId: string; name: string }>>();
  const shouldShowNotShared = role === "team_lead" || role === "report_manager" || role === "hod" || role === "admin" || role === "ceo";

  for (const leaveRequest of filteredLeaveRequests) {
    const current = leaveByEmployeeId.get(leaveRequest.employeeId);
    const currentPriority = current?.status === "approved" ? 3 : current?.status === "forwarded_to_hod" ? 2 : current?.status === "pending_tl" ? 1 : 0;
    const nextPriority = leaveRequest.status === "approved" ? 3 : leaveRequest.status === "forwarded_to_hod" ? 2 : 1;
    if (!current || nextPriority >= currentPriority) {
      leaveByEmployeeId.set(leaveRequest.employeeId, leaveRequest);
    }

    const teamLeaves = leaveMembersByTeam.get(leaveRequest.teamName) ?? [];
    if (
      !teamLeaves.some(
        (item) =>
          item.employeeId === leaveRequest.employeeId &&
          item.leaveDuration === leaveRequest.leaveDuration &&
          item.leaveHalf === leaveRequest.leaveHalf &&
          item.status === leaveRequest.status
      )
    ) {
      teamLeaves.push({
        employeeId: leaveRequest.employeeId,
        name: leaveRequest.name,
        leaveDuration: leaveRequest.leaveDuration,
        leaveHalf: leaveRequest.leaveHalf,
        status: leaveRequest.status,
        reviewedByName: leaveRequest.reviewedByName ?? null
      });
      leaveMembersByTeam.set(leaveRequest.teamName, teamLeaves);
    }
  }

  if (shouldShowNotShared) {
    const visibleEmployeeIdSet = new Set(visibleEmployeeIds);
    const reportEmployeeIdSet = new Set(reports.map((report: any) => String(report.employeeId)));
    for (const user of allUsers as Array<{
      id?: unknown;
      _id?: unknown;
      name?: string | null;
      role?: string | null;
      teamName?: string | null;
      teamNames?: string[] | null;
    }>) {
      const userId = user.id || user._id;
      if (!userId || !user.name) continue;
      
      if (role === "ceo") {
        if (user.role !== "hod") continue;
      } else {
        if (["admin", "hod", "report_manager"].includes(user.role ?? "")) continue;
      }

      const employeeId = String(userId);
      if (!visibleEmployeeIdSet.has(employeeId) || reportEmployeeIdSet.has(employeeId) || leaveByEmployeeId.has(employeeId)) {
        continue;
      }

      const teamKey = resolveTeamName(user);

      // Finance is explicitly excluded from standard consolidated reports.
      if (financeUserIdSet.has(employeeId)) continue;

      // Exclude teams not in the selected department.
      if (departmentTeamNamesSet && !departmentTeamNamesSet.has(teamKey)) continue;

      const current = notSharedMembersByTeam.get(teamKey) ?? [];
      if (!current.some((item) => item.employeeId === employeeId)) {
        current.push({
          employeeId,
          name: user.name
        });
        notSharedMembersByTeam.set(teamKey, current);
      }
    }
  }

  const grouped = new Map<string, ReportSheetTeamGroup>();

  const sortedReports = (reports as any[])
    .slice()
    .sort((a, b) => {
      const aRole = userMap.get(String(a.employeeId))?.role === "team_lead" ? 0 : 1;
      const bRole = userMap.get(String(b.employeeId))?.role === "team_lead" ? 0 : 1;
      return a.teamName.localeCompare(b.teamName) || aRole - bRole || a.name.localeCompare(b.name);
    })
    .map((report) => ({
      id: String(report.id),
      _id: String(report.id),
      employeeId: String(report.employeeId),
      name: report.name,
      sourceTeamName: report.teamName,
      teamName: getTeamDisplayName(report.teamName, teamTypeShowNameMap),
      reportType: report.reportType,
      reportDate: report.reportDate,
      attachmentLink: report.attachmentLink,
      dailyMeetingUpdate: report.dailyMeetingUpdate,
      completedWork: report.completedWork,
      pendingWork: report.pendingWork,
      blockers: report.blockers,
      requiredClarification: report.requiredClarification,
      employeeRole: userMap.get(String(report.employeeId))?.role ?? null,
      status: (report as any).status ?? "submitted",
      rejectionReason: (report as any).rejectionReason ?? undefined,
      reviewNotes: (report as any).reviewNotes ?? undefined,
      reviewedByName: (report as any).reviewedByName ?? undefined,
      reviewedAt: (report as any).reviewedAt ?? undefined,
      verificationLevel: (report as any).verificationLevel ?? undefined,
      leaveStatus: leaveByEmployeeId.get(String(report.employeeId))?.status ?? null,
      leaveType: leaveByEmployeeId.get(String(report.employeeId))?.leaveType ?? undefined,
      leaveReason: leaveByEmployeeId.get(String(report.employeeId))?.reason ?? undefined,
      leaveReviewedByName: leaveByEmployeeId.get(String(report.employeeId))?.reviewedByName ?? undefined,
      nextDayApprovalItems: report.approvalItems ?? undefined,
      constructionWorkPlan: report.workPlans ?? undefined,
      constructionMaterialUtilization: report.materialUtilizations ?? undefined,
      constructionTomorrowWorkPlan: report.tomorrowWorkPlans ?? undefined,
      marketingSelfItems: report.marketingSelfItems ?? undefined,
      marketingClientItems: report.marketingClientItems ?? undefined
    }));

  for (const report of sortedReports) {
    const sourceTeamName = report.sourceTeamName;
    const current = grouped.get(report.teamName) ?? {
      teamName: report.teamName,
      dailyMeetingUpdate: "",
      reports: [],
      leaveMembers: leaveMembersByTeam.get(sourceTeamName) ?? [],
      notSharedMembers: notSharedMembersByTeam.get(sourceTeamName) ?? []
    };

    if (report.dailyMeetingUpdate?.trim()) {
      current.dailyMeetingUpdate = current.dailyMeetingUpdate
        ? `${current.dailyMeetingUpdate}\n\n${report.dailyMeetingUpdate.trim()}`
        : report.dailyMeetingUpdate.trim();
    }
    if (!current.leaveMembers?.length && leaveMembersByTeam.get(sourceTeamName)?.length) {
      current.leaveMembers = leaveMembersByTeam.get(sourceTeamName) ?? [];
    }
    current.reports.push(report);
    grouped.set(report.teamName, current);
  }

  for (const [teamName, leaveMembers] of leaveMembersByTeam.entries()) {
    const displayTeamName = getTeamDisplayName(teamName, teamTypeShowNameMap);
    if (!grouped.has(displayTeamName)) {
      grouped.set(displayTeamName, {
        teamName: displayTeamName,
        dailyMeetingUpdate: "",
        reports: [],
        leaveMembers,
        notSharedMembers: notSharedMembersByTeam.get(teamName) ?? []
      });
    }
  }

  for (const [teamName, notSharedMembers] of notSharedMembersByTeam.entries()) {
    const displayTeamName = getTeamDisplayName(teamName, teamTypeShowNameMap);
    if (!grouped.has(displayTeamName)) {
      grouped.set(displayTeamName, {
        teamName: displayTeamName,
        dailyMeetingUpdate: "",
        reports: [],
        leaveMembers: leaveMembersByTeam.get(teamName) ?? [],
        notSharedMembers
      });
    }
  }

  const teamGroups = Array.from(grouped.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));

  return {
    date,
    reportCount: reports.length,
    teamCount: teamGroups.length,
    teamGroups
  };
}
