import { connectToDatabase } from "@/lib/db";
import DailyReport from "@/models/DailyReport";
import User from "@/models/User";
import { getActiveLeaveRequestsForRange, toInclusiveDateRange, type ActiveLeaveRequest } from "@/lib/leave-requests";
import type { ReportSheetEntry, ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { getActiveTeamTypeShowNameMap, getFinanceTeamInternalNames, getTeamNamesByDepartment } from "@/lib/team-types";

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
    if (!user._id || !user.name) continue;

    const isDescendant = visibleUserNames.has(user.name);
    const isSameTeam =
      Boolean(currentUser.teamName) &&
      (user.teamName === currentUser.teamName || user.teamNames?.includes(currentUser.teamName ?? ""));

    if (isDescendant || isSameTeam) {
      visibleUserIds.add(String(user._id));
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
  workspaceId?: string
) {
  await connectToDatabase();
  const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap();

  // Resolve which internal names belong to the Finance group.
  const financeTeamNames = await getFinanceTeamInternalNames();
  const financeTeamNameSet = new Set(financeTeamNames);

  let departmentFilterUserIds: Set<string> | null = null;
  let departmentTeamNamesSet: Set<string> | null = null;

  if (department && department !== "All") {
    const departmentTeamNames = await getTeamNamesByDepartment(department);
    const deptUsers = await User.find(
      {
        isDeleted: { $ne: true },
        $or: [
          { "departments.name": department },
          { department: department },
          { teamName: department },
          { teamNames: department },
          { teamName: { $in: departmentTeamNames } },
          { teamNames: { $in: departmentTeamNames } }
        ]
      },
      { _id: 1, teamName: 1, teamNames: 1 }
    ).lean();

    const deptUserIds = deptUsers.map((u) => String(u._id));
    const deptUserTeamNames = deptUsers.flatMap((u) => [u.teamName, ...(u.teamNames ?? [])]).filter(Boolean) as string[];

    departmentFilterUserIds = new Set(deptUserIds);
    departmentTeamNamesSet = new Set([department, ...departmentTeamNames, ...deptUserTeamNames]);
  }

  const allUsers = await User.find({}).lean();
  const userRoleById = new Map<string, string | null>();
  for (const user of allUsers as Array<{ _id?: unknown; role?: string | null }>) {
    if (!user._id) continue;
    userRoleById.set(String(user._id), user.role ?? null);
  }

  const currentUserObj = (await User.findOne({ name: userName }).lean()) as any;
  const currentUserDepts = currentUserObj?.departments ?? [];
  const resolvedVisibleIds = await getVisibleReportEmployeeIds({
    id: currentUserObj ? String(currentUserObj._id) : "",
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
  if (workspaceId) {
    conditions.push({ workspaceId });
  }

  // Handle visible employee IDs based on role
  let visibleEmployeeIds: string[] = [];

  if (resolvedVisibleIds && !isManagementOrDeptView) {
    visibleEmployeeIds = resolvedVisibleIds;
    if (!visibleEmployeeIds.length) {
      return {
        date,
        reportCount: 0,
        teamCount: 0,
        teamGroups: []
      };
    }
    conditions.push({ employeeId: { $in: visibleEmployeeIds } });
  } else {
    visibleEmployeeIds = allUsers.map((user) => String(user._id)).filter(Boolean);
  }

  const { start: day, end: nextDay } = toInclusiveDateRange(date);
  conditions.push({ reportDate: { $gte: day, $lt: nextDay } });

  // Finance is decoupled and explicitly excluded from standard consolidated multi-department reports UNLESS Finance is explicitly selected.
  if (department !== "Finance" && financeTeamNames.length > 0) {
    conditions.push({ teamName: { $nin: financeTeamNames } });
  }

  // If a department is specified, only include reports for users or teams in that department
  if (departmentTeamNamesSet && departmentFilterUserIds) {
    conditions.push({
      $or: [
        { employeeId: { $in: Array.from(departmentFilterUserIds) } },
        { teamName: { $in: Array.from(departmentTeamNamesSet) } },
        { department: department }
      ]
    });
  }

  const filter = conditions.length <= 1 ? conditions[0] ?? {} : { $and: conditions };
  const reports = (await DailyReport.find(filter).sort({ reportDate: -1, createdAt: -1 }).lean()) as unknown as Array<
    ReportSheetEntry & { employeeId: unknown }
  >;

  const userMap = new Map<string, { role?: string | null }>();
  if (reports.length) {
    const employeeIds = Array.from(new Set(reports.map((report) => String(report.employeeId))));
    const users = await User.find({ _id: { $in: employeeIds } }).lean();
    for (const item of users) {
      userMap.set(String(item._id), { role: item.role });
    }
  }

  const leaveRequests = await getActiveLeaveRequestsForRange({
    employeeIds: visibleEmployeeIds,
    dateFrom: date,
    dateTo: date
  });

  // Filter out Finance leave requests unless Finance department is explicitly requested, and any not in the selected department
  const filteredLeaveRequests = leaveRequests.filter((lr) => {
    if (department !== "Finance" && financeTeamNameSet.has(lr.teamName)) return false;
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
    const reportEmployeeIdSet = new Set(reports.map((report) => String(report.employeeId)));
    for (const user of allUsers as Array<{
      _id?: unknown;
      name?: string | null;
      role?: string | null;
      teamName?: string | null;
      teamNames?: string[] | null;
    }>) {
      if (!user._id || !user.name) continue;
      if (["admin", "hod", "report_manager"].includes(user.role ?? "")) continue;
      const employeeId = String(user._id);
      if (!visibleEmployeeIdSet.has(employeeId) || reportEmployeeIdSet.has(employeeId) || leaveByEmployeeId.has(employeeId)) {
        continue;
      }

      const teamKey = resolveTeamName(user);

      // Finance is explicitly excluded from standard consolidated reports.
      if (financeTeamNameSet.has(teamKey)) continue;

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

  const sortedReports = reports
    .slice()
    .sort((a, b) => {
      const aRole = userMap.get(String(a.employeeId))?.role === "team_lead" ? 0 : 1;
      const bRole = userMap.get(String(b.employeeId))?.role === "team_lead" ? 0 : 1;
      return a.teamName.localeCompare(b.teamName) || aRole - bRole || a.name.localeCompare(b.name);
    })
    .map((report) => ({
      _id: String(report._id),
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
      nextDayApprovalItems: ((report as unknown as { nextDayApprovalItems?: Array<{ particulars: string; amountINR: number; amountRiyal: number; reason: string; review: string; approval: "pending" | "yes" | "no" }> }).nextDayApprovalItems) ?? undefined
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
