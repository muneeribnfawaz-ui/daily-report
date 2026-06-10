import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import User from "@/models/User";
import { getActiveLeaveRequestsForRange } from "@/lib/leave-requests";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { canEditDailyReport } from "@/lib/report-edit-access";

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
  isLocked?: boolean | null;
  editAccessRequested?: boolean | null;
  editAccessGranted?: boolean | null;
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
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
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
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const requestedLimit = Number(url.searchParams.get("limit") ?? "5");

  await connectToDatabase();
  const conditions: Record<string, unknown>[] = [];
  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user);
  if (visibleEmployeeIds) {
    conditions.push({ employeeId: { $in: visibleEmployeeIds } });
  }
  if (team) conditions.push({ teamName: team });
  if (status) conditions.push({ status });
  if (locked !== null && locked !== undefined && locked !== "") conditions.push({ isLocked: locked === "true" });
  if (employee) conditions.push({ name: { $regex: employee, $options: "i" } });
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      dateFilter.$lt = end;
    }
    conditions.push({ reportDate: dateFilter });
  }

  const filter = conditions.length <= 1 ? conditions[0] ?? {} : { $and: conditions };
  const reports = (await DailyReport.find(filter).sort({ createdAt: -1 }).lean()) as unknown as ReportItem[];

  if (view === "date-paginated") {
    const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
    const safeLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 5;
    const groupedByDate = new Map<string, DateGroupItem>();

    for (const report of reports) {
      const key = toDateKey(report.reportDate);
      const current = groupedByDate.get(key) ?? {
        date: key,
        reportCount: 0,
        teamNames: [],
        reports: []
      };
      current.reportCount += 1;
      current.reports.push(report);
      if (report.teamName && !current.teamNames.includes(report.teamName)) {
        current.teamNames.push(report.teamName);
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

  const employeeIds = Array.from(new Set(reports.map((report) => String(report.employeeId)).filter(Boolean)));
  const users = employeeIds.length ? await User.find({ _id: { $in: employeeIds } }).lean() : [];
  const userMap = new Map<string, { role?: string | null }>();
  for (const item of users) {
    userMap.set(String(item._id), { role: item.role });
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

  const data = reports.map((report) => ({
    _id: String(report._id),
    employeeId: String(report.employeeId),
    name: report.name ?? "",
    teamName: report.teamName ?? "",
    reportType: report.reportType ?? "",
    reportDate: report.reportDate,
    attachmentLink: report.attachmentLink ?? undefined,
    dailyMeetingUpdate: report.dailyMeetingUpdate ?? undefined,
    completedWork: report.completedWork ?? "",
    pendingWork: report.pendingWork ?? "",
    blockers: report.blockers ?? "",
    requiredClarification: report.requiredClarification ?? "",
    status: report.status ?? "submitted",
    isLocked: Boolean(report.isLocked),
    canEdit: canEditDailyReport(report, { role: userMap.get(String(report.employeeId))?.role ?? null }),
    editAccessRequested: Boolean(report.editAccessRequested),
    editAccessGranted: Boolean(report.editAccessGranted),
    employeeRole: userMap.get(String(report.employeeId))?.role ?? null,
    leaveStatus: leaveByEmployeeId.get(String(report.employeeId))?.status ?? null,
    leaveType: leaveByEmployeeId.get(String(report.employeeId))?.leaveType ?? undefined,
    leaveReason: leaveByEmployeeId.get(String(report.employeeId))?.reason ?? undefined,
    leaveReviewedByName: leaveByEmployeeId.get(String(report.employeeId))?.reviewedByName ?? null
  }));

  return NextResponse.json({ success: true, data });
}
