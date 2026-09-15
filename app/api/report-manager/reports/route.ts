import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mapReportRelations, reportRelationsInclude } from "@/lib/report-mapper";
import { getActiveLeaveRequestsForRange } from "@/lib/leave-requests";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { canEditDailyReport } from "@/lib/report-edit-access";

import { formatDisplayName } from "@/lib/utils";

type ReportItem = {
  _id: unknown;
  name?: string | null;
  teamName?: string | null;
  reportType?: string | null;
  reportDate?: string | Date;
  attachmentLink?: string | null;
  dailyMeetingUpdate?: string | null;
  completedWork?: string | null;
  pendingWork?: string | null;
  blockers?: string | null;
  requiredClarification?: string | null;
  employeeId?: unknown;
  status?: string | null;
  rejectionReason?: string | null;
  reviewNotes?: string | null;
  reviewedBy?: unknown;
  reviewedByName?: string | null;
  reviewedAt?: string | Date | null;
  verificationLevel?: string | null;
  reportManagerStatus?: string | null;
  reportManagerReview?: string | null;
  reportManagerReviewedBy?: unknown;
  reportManagerReviewedByName?: string | null;
  reportManagerReviewedAt?: string | Date | null;
  isLocked?: boolean | null;
  editAccessRequested?: boolean | null;
  editAccessGranted?: boolean | null;
  constructionWorkPlan?: any[];
  constructionMaterialUtilization?: any[];
  constructionTomorrowWorkPlan?: any[];
  employeeRole?: string | null;
};

type DateGroupItem = {
  date: string;
  reportCount: number;
  teamNames: string[];
  reports: ReportItem[];
};

function toDateKey(value: Date | string | undefined) {
  return new Date(value ?? new Date()).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const team = url.searchParams.get("team");
  const employee = url.searchParams.get("employee");
  const status = url.searchParams.get("status");
  const locked = url.searchParams.get("locked");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const view = url.searchParams.get("view");
  const scope = (url.searchParams.get("scope") as "hod" | "tl" | "all" | null) ?? undefined;
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const requestedLimit = Number(url.searchParams.get("limit") ?? "5");
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

    const conditions: Record<string, unknown>[] = [];
  if (workspaceId && workspaceId !== "all") {
    conditions.push({ workspaceId });
  }
  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user, { scope });
  if (visibleEmployeeIds) {
    if (user.role === "ceo" && scope === "hod") {
      conditions.push({
        OR: [
          { employeeId: { in: visibleEmployeeIds } },
          { verificationLevel: "hod" }
        ]
      });
    } else {
      conditions.push({ employeeId: { in: visibleEmployeeIds } });
    }
  }
  if (team && team !== "All" && team !== "all") {
    const matchingTeamTypes = await db.teamType.findMany({
      where: {
        isDeleted: false,
        OR: [
          { name: team },
          { showName: team },
          { department: team }
        ]
      },
      select: { name: true, showName: true }
    });

    const matchedNames = new Set<string>([team]);
    for (const tt of matchingTeamTypes) {
      if (tt.name) matchedNames.add(tt.name);
      if (tt.showName) matchedNames.add(tt.showName);
    }

    conditions.push({ teamName: { in: Array.from(matchedNames) } });
  }
  if (status) conditions.push({ status });
  if (locked !== null && locked !== undefined && locked !== "") conditions.push({ isLocked: locked === "true" });
  if (employee) conditions.push({ name: { contains: employee, mode: "insensitive" } });
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      dateFilter.lt = end;
    }
    conditions.push({ reportDate: dateFilter });
  }

  const filter = conditions.length <= 1 ? conditions[0] ?? {} : { AND: conditions };
  const rawReports = await db.dailyReport.findMany({ 
    where: filter, 
    orderBy: { createdAt: "desc" },
    include: reportRelationsInclude
  });

  const reports = rawReports.map(mapReportRelations) as unknown as ReportItem[];
  const employeeIds = Array.from(new Set(reports.map((report) => String(report.employeeId)).filter(Boolean)));
  const users = employeeIds.length ? await db.user.findMany({ where: { id: { in: employeeIds } } }) : [];
  const members = employeeIds.length ? await db.workspaceMember.findMany({
    where: { userId: { in: employeeIds }, isActive: true },
    select: { userId: true, role: true, teamNames: true, teamName: true }
  }) : [];
  const userMap = new Map<string, { role?: string | null; teamNames?: string[]; teamName?: string | null }>();
  for (const item of users) {
    userMap.set(String(item.id), { role: item.role, teamNames: [], teamName: null });
  }
  for (const item of members) {
    const existing = userMap.get(String(item.userId)) || {};
    userMap.set(String(item.userId), {
      ...existing,
      role: item.role || existing.role,
      teamNames: item.teamNames || existing.teamNames || [],
      teamName: item.teamName || existing.teamName || null
    });
  }

  const resolveDisplayTeamName = (report: any) => {
    const empId = String(report.employeeId);
    const authorInfo = userMap.get(empId);
    const authorRole = authorInfo?.role || report.employeeRole;
    const assignedTeams = (authorInfo?.teamNames || []).filter(Boolean);

    // Report Manager, HOD, CEO, and Admin are not assigned to teams
    if (authorRole === "report_manager" || authorRole === "hod" || authorRole === "ceo" || authorRole === "admin") {
      return "-";
    }

    // If user has specific assigned team(s)
    if (assignedTeams.length > 0) {
      if (report.teamName && assignedTeams.includes(report.teamName)) {
        return formatDisplayName(report.teamName);
      }
      return formatDisplayName(assignedTeams[0]);
    }

    if (authorInfo?.teamName) {
      return formatDisplayName(authorInfo.teamName);
    }

    if (report.teamName && !["Software", "Marketing", "Construction", "Finance", "General"].includes(report.teamName.trim())) {
      return formatDisplayName(report.teamName);
    }

    return "-";
  };

  // Pre-fetch team lead reviews given by report managers
  const rmUserIds = employeeIds.filter((id) => userMap.get(id)?.role === "report_manager" || userMap.get(id)?.role === "admin" || userMap.get(id)?.role === "ceo" || userMap.get(id)?.role === "hod");
  let allTlReviews: any[] = [];
  if (rmUserIds.length > 0) {
    allTlReviews = await db.dailyReport.findMany({
      where: {
        reportManagerReviewedBy: { in: rmUserIds },
        ...(workspaceId && workspaceId !== "all" ? { workspaceId } : {})
      },
      select: {
        id: true,
        name: true,
        teamName: true,
        reportType: true,
        reportDate: true,
        status: true,
        reportManagerStatus: true,
        reportManagerReview: true,
        reportManagerReviewedBy: true,
        reportManagerReviewedByName: true,
        reportManagerReviewedAt: true
      },
      orderBy: { createdAt: "asc" }
    });
  }

  const tlReviewsByManagerAndDate = new Map<string, any[]>();
  for (const tlr of allTlReviews) {
    if (tlr.reportManagerStatus || tlr.reportManagerReview) {
      const dateKey = toDateKey(tlr.reportDate);
      const managerKey = `${String(tlr.reportManagerReviewedBy)}_${dateKey}`;
      const list = tlReviewsByManagerAndDate.get(managerKey) || [];
      list.push(tlr);
      tlReviewsByManagerAndDate.set(managerKey, list);
    }
  }

  if (view === "date-paginated") {
    const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
    const safeLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 5;
    const groupedByDate = new Map<string, DateGroupItem>();

    for (const report of reports) {
      const formattedTeamName = resolveDisplayTeamName(report);
      const key = toDateKey(report.reportDate);
      const current = groupedByDate.get(key) ?? {
        date: key,
        reportCount: 0,
        teamNames: [],
        reports: []
      };
      const managerKey = `${String(report.employeeId)}_${key}`;
      const teamLeadReviews = tlReviewsByManagerAndDate.get(managerKey) || [];

      current.reportCount += 1;
      current.reports.push({
        ...report,
        _id: (report as any).id,
        teamName: formattedTeamName,
        employeeRole: userMap.get(String(report.employeeId))?.role ?? null,
        teamLeadReviews
      } as any);
      if (formattedTeamName && formattedTeamName !== "-" && !current.teamNames.includes(formattedTeamName)) {
        current.teamNames.push(formattedTeamName);
      }
      groupedByDate.set(key, current);
    }

    const allGroups = Array.from(groupedByDate.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((group) => ({
        ...group,
        teamNames: group.teamNames.sort(),
        reports: group.reports.sort((left, right) => {
          const leftValue = new Date(left.reportDate ?? 0).getTime();
          const rightValue = new Date(right.reportDate ?? 0).getTime();
          return rightValue - leftValue;
        })
      }));

    const totalDates = allGroups.length;
    const totalPages = totalDates === 0 ? 0 : Math.ceil(totalDates / safeLimit);
    const currentPage = totalPages === 0 ? 1 : Math.min(safePage, totalPages);
    const startIndex = (currentPage - 1) * safeLimit;
    const items = allGroups.slice(startIndex, startIndex + safeLimit);

    return NextResponse.json({
      success: true,
      data: {
        items,
        page: currentPage,
        limit: safeLimit,
        totalDates,
        totalPages
      }
    });
  }

  const leaveRequests = dateFrom || dateTo ? await getActiveLeaveRequestsForRange({
    employeeIds,
    dateFrom: dateFrom ?? dateTo ?? new Date().toISOString().slice(0, 10),
    dateTo: dateTo ?? dateFrom
  }) : [];
  const leaveByEmployeeId = new Map<string, { status: string; leaveType: string; reason?: string | null; reviewedByName?: string | null }>();
  for (const leaveRequest of leaveRequests) {
    leaveByEmployeeId.set(leaveRequest.employeeId, {
      status: leaveRequest.status,
      leaveType: leaveRequest.leaveType,
      reason: leaveRequest.reason ?? null,
      reviewedByName: leaveRequest.reviewedByName ?? null
    });
  }

  const data = reports.map((report: any) => {
    const key = toDateKey(report.reportDate);
    const managerKey = `${String(report.employeeId)}_${key}`;
    const teamLeadReviews = tlReviewsByManagerAndDate.get(managerKey) || [];

    return {
      id: String(report.id),
      _id: String(report.id),
      employeeId: String(report.employeeId),
      employeeRole: userMap.get(String(report.employeeId))?.role ?? null,
      teamLeadReviews,
      name: report.name ?? "",
      teamName: resolveDisplayTeamName(report),
      reportType: report.reportType ?? "",
      reportDate: report.reportDate,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      submittedAt: report.submittedAt,
      attachmentLink: report.attachmentLink ?? undefined,
      dailyMeetingUpdate: report.dailyMeetingUpdate ?? undefined,
      completedWork: report.completedWork ?? "",
      pendingWork: report.pendingWork ?? "",
      blockers: report.blockers ?? "",
      requiredClarification: report.requiredClarification ?? "",
      constructionWorkPlan: report.constructionWorkPlan,
      constructionMaterialUtilization: report.constructionMaterialUtilization,
      constructionTomorrowWorkPlan: report.constructionTomorrowWorkPlan,
      status: report.status ?? "submitted",
      rejectionReason: report.rejectionReason ?? undefined,
      reviewNotes: report.reviewNotes ?? undefined,
      reviewedByName: report.reviewedByName ?? undefined,
      reviewedAt: report.reviewedAt ?? undefined,
      verificationLevel: report.verificationLevel ?? undefined,
      reportManagerStatus: report.reportManagerStatus ?? undefined,
      reportManagerReview: report.reportManagerReview ?? undefined,
      reportManagerReviewedByName: report.reportManagerReviewedByName ?? undefined,
      reportManagerReviewedAt: report.reportManagerReviewedAt ?? undefined,
      isLocked: Boolean(report.isLocked),
      canEdit: canEditDailyReport(report, { role: userMap.get(String(report.employeeId))?.role ?? null }),
      editAccessRequested: Boolean(report.editAccessRequested),
      editAccessGranted: Boolean(report.editAccessGranted),
      leaveStatus: leaveByEmployeeId.get(String(report.employeeId))?.status ?? null,
      leaveType: leaveByEmployeeId.get(String(report.employeeId))?.leaveType ?? undefined,
      leaveReason: leaveByEmployeeId.get(String(report.employeeId))?.reason ?? undefined,
      leaveReviewedByName: leaveByEmployeeId.get(String(report.employeeId))?.reviewedByName ?? null
    };
  });

  return NextResponse.json({ success: true, data });
}
