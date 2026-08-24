import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { leaveRequestSchema } from "@/lib/validation";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";
import WorkspaceMember from "@/models/WorkspaceMember";
import { logAuditEntry } from "@/lib/audit";

function getLeaveNumberPrefix() {
  const yearSuffix = String(new Date().getFullYear()).slice(-2);
  return `MIF-LV-${yearSuffix}-`;
}

function toDateRange(dateValue: string) {
  const day = new Date(dateValue);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  return { day, nextDay };
}

function canManageLeave(role: string) {
  return role === "team_lead" || role === "report_manager" || role === "hod" || role === "admin" || role === "ceo";
}

type CreatedLeaveRequest = {
  _id: unknown;
  toObject: () => Record<string, unknown>;
};

async function generateLeaveNumber() {
  const leaveNumberPrefix = getLeaveNumberPrefix();
  const existingCount = await LeaveRequest.countDocuments({
    leaveNumber: { $regex: `^${leaveNumberPrefix}` }
  });

  return `${leaveNumberPrefix}${existingCount + 1}`;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = leaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid leave request payload" }, { status: 400 });
    }

    await connectToDatabase();

    const { day: fromDate } = toDateRange(parsed.data.fromDate);
    const { day: toDate } = toDateRange(parsed.data.toDate);

    const workspaceId = body.workspaceId || request.headers.get("x-workspace-id") || user.workspaceId;

    let leaveRequest: CreatedLeaveRequest | null = null;
    for (let attempt = 0; attempt < 3 && !leaveRequest; attempt += 1) {
      const leaveNumber = await generateLeaveNumber();
      try {
        leaveRequest = (await LeaveRequest.create({
          workspaceId,
          employeeId: user.id,
          leaveNumber,
          name: user.name,
          teamName: user.teamName ?? "",
          requestedByRole: user.role === "team_lead" ? "team_lead" : "team_member",
          leaveType: parsed.data.leaveType,
          leaveDuration: parsed.data.leaveDuration,
          leaveHalf: parsed.data.leaveDuration === "half_day" ? parsed.data.leaveHalf : null,
          fromDate,
          toDate: parsed.data.leaveDuration === "half_day" ? fromDate : toDate,
          reason: parsed.data.reason,
          status: "pending_tl"
        })) as CreatedLeaveRequest;
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || (error as { code?: number }).code !== 11000) {
          throw error;
        }
      }
    }

    if (!leaveRequest) {
      return NextResponse.json({ success: false, message: "Failed to generate leave number. Please try again." }, { status: 500 });
    }

    await logAuditEntry({
      action: "Leave Request Created",
      userId: user.id,
      userName: user.name,
      leaveRequestId: String(leaveRequest._id),
      newValue: leaveRequest.toObject()
    });

    return NextResponse.json({ success: true, data: leaveRequest, message: "Leave request submitted successfully." }, { status: 201 });
  } catch (error) {
    console.error("Failed to create leave request", error);
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ success: false, message: error.message || "Invalid leave request payload" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create leave request" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const date = url.searchParams.get("date");
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const requestedLimit = Number(url.searchParams.get("limit") ?? "10");
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

  await connectToDatabase();
  const conditions: Record<string, any>[] = [];

  if (user.role !== "admin") {
    const memberships = await WorkspaceMember.find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as any[];
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      conditions.push({ workspaceId: allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id" });
    } else {
      conditions.push({ workspaceId: { $in: allowedWorkspaceIds } });
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      conditions.push({ workspaceId });
    }
  }

  if (user.role === "team_member") {
    conditions.push({ employeeId: user.id });
  } else if (user.role === "team_lead") {
    conditions.push({ $or: [{ teamName: user.teamName }, { employeeId: user.id }] });
  } else if (!canManageLeave(user.role)) {
    conditions.push({ employeeId: user.id });
  }

  if (status) {
    conditions.push({ status });
  }

  if (date) {
    const { day, nextDay } = toDateRange(date);
    conditions.push({ fromDate: { $lte: nextDay }, toDate: { $gte: day } });
  }

  const filter = conditions.length ? { $and: conditions } : {};

  const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const safeLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 10;
  const totalCount = await LeaveRequest.countDocuments(filter);
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / safeLimit);
  const currentPage = totalPages === 0 ? 1 : Math.min(safePage, totalPages);
  const skip = (currentPage - 1) * safeLimit;

  const leaveRequests = await LeaveRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean();

  const reviewerIds = Array.from(
    new Set(
      leaveRequests
        .flatMap((leaveRequest) => [leaveRequest.tlReviewedBy, leaveRequest.hodReviewedBy])
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
  const reviewers = reviewerIds.length ? await User.find({ _id: { $in: reviewerIds } }).lean() : [];
  const reviewerMap = new Map<string, { name?: string | null; role?: string | null }>();
  for (const reviewer of reviewers) {
    reviewerMap.set(String(reviewer._id), { name: reviewer.name, role: reviewer.role });
  }

  return NextResponse.json({
    success: true,
    data: {
      items: leaveRequests.map((requestItem) => ({
        _id: String(requestItem._id),
        employeeId: String(requestItem.employeeId),
        leaveNumber: requestItem.leaveNumber,
        name: requestItem.name,
        teamName: requestItem.teamName,
        requestedByRole: requestItem.requestedByRole,
        leaveType: requestItem.leaveType,
        leaveDuration: requestItem.leaveDuration ?? "full_day",
        leaveHalf: requestItem.leaveHalf ?? null,
        fromDate: requestItem.fromDate,
        toDate: requestItem.toDate,
        reason: requestItem.reason,
        status: requestItem.status,
        tlComment: requestItem.tlComment,
        hodComment: requestItem.hodComment,
        createdAt: requestItem.createdAt,
        approvedByName:
          requestItem.status === "approved"
            ? reviewerMap.get(String(requestItem.hodReviewedBy ?? requestItem.tlReviewedBy ?? ""))?.name ?? null
            : null,
        approvedByRole:
          requestItem.status === "approved"
            ? reviewerMap.get(String(requestItem.hodReviewedBy ?? requestItem.tlReviewedBy ?? ""))?.role ?? null
            : null
      })),
      page: currentPage,
      limit: safeLimit,
      totalCount,
      totalPages
    }
  });
}
