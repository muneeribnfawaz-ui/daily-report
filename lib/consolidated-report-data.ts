import { connectToDatabase } from "@/lib/db";
import DailyReport from "@/models/DailyReport";
import User from "@/models/User";
import { getActiveLeaveRequestsForRange, toInclusiveDateRange, type ActiveLeaveRequest } from "@/lib/leave-requests";
import type { ReportSheetEntry, ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";
import { getActiveTeamTypeShowNameMap } from "@/lib/team-types";

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

function getTeamDisplayName(teamName: string, teamTypeShowNameMap: Record<string, string>) {
  if (!teamName.trim() || teamName.toLowerCase() === "undefined") return "MIF Tech Members";
  return teamTypeShowNameMap[teamName] ?? teamName;
}

function shouldIncludeVisibleUser(userRole: string | null | undefined, currentRole: string) {
  if (currentRole === "admin" || currentRole === "hod") {
    return true;
  }

  if (currentRole === "team_lead") {
    return !["admin", "hod", "report_manager"].includes(userRole ?? "");
  }

  return false;
}

export function toDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export async function getConsolidatedReportDetail(
  date: string,
  userName: string,
  role: string,
  teamName?: string | null
) {
  await connectToDatabase();
  const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap();
  const allUsers = await User.find({}).lean();
  const userRoleById = new Map<string, string | null>();
  for (const user of allUsers as Array<{ _id?: unknown; role?: string | null }>) {
    if (!user._id) continue;
    userRoleById.set(String(user._id), user.role ?? null);
  }

  const conditions: Record<string, unknown>[] = [];
  let visibleEmployeeIds: string[] = [];
  if (role !== "admin" && role !== "report_manager") {
    visibleEmployeeIds = getVisibleUserIds(
      allUsers as Array<{
        _id?: unknown;
        name?: string | null;
        managerName?: string | null;
        teamName?: string | null;
        teamNames?: string[] | null;
      }>,
      { name: userName, teamName: teamName ?? null }
    );

    visibleEmployeeIds = visibleEmployeeIds.filter((employeeId) => shouldIncludeVisibleUser(userRoleById.get(employeeId), role));

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
  const shouldShowNotShared = role === "team_lead" || role === "report_manager" || role === "hod" || role === "admin";

  for (const leaveRequest of leaveRequests) {
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
      leaveStatus: leaveByEmployeeId.get(String(report.employeeId))?.status ?? null,
      leaveType: leaveByEmployeeId.get(String(report.employeeId))?.leaveType ?? undefined,
      leaveReason: leaveByEmployeeId.get(String(report.employeeId))?.reason ?? undefined,
      leaveReviewedByName: leaveByEmployeeId.get(String(report.employeeId))?.reviewedByName ?? undefined
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
