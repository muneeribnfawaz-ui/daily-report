import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";

export type ActiveLeaveRequest = {
  employeeId: string;
  name: string;
  teamName: string;
  leaveType: string;
  leaveDuration: "full_day" | "half_day";
  leaveHalf?: "first_half" | "second_half" | null;
  status: "pending_tl" | "forwarded_to_hod" | "approved";
  reason?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  fromDate: Date;
  toDate: Date;
};

export function toInclusiveDateRange(dateFrom: string, dateTo?: string | null) {
  const start = new Date(dateFrom);
  const endBase = new Date(dateTo ?? dateFrom);
  const end = new Date(endBase);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function getActiveLeaveRequestsForRange({
  employeeIds,
  dateFrom,
  dateTo
}: {
  employeeIds: string[];
  dateFrom: string;
  dateTo?: string | null;
}) {
  if (!employeeIds.length) return [] as ActiveLeaveRequest[];

  const { start, end } = toInclusiveDateRange(dateFrom, dateTo);
  const leaveRequests = await LeaveRequest.find({
    employeeId: { $in: employeeIds },
    status: { $in: ["pending_tl", "forwarded_to_hod", "approved"] },
    fromDate: { $lte: end },
    toDate: { $gte: start }
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

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

  return leaveRequests.map((leaveRequest) => ({
    employeeId: String(leaveRequest.employeeId),
    name: leaveRequest.name,
    teamName: leaveRequest.teamName,
    leaveType: leaveRequest.leaveType,
    leaveDuration: leaveRequest.leaveDuration ?? "full_day",
    leaveHalf: leaveRequest.leaveHalf ?? null,
    status: leaveRequest.status,
    reason: leaveRequest.reason,
    reviewedByName:
      leaveRequest.status === "approved"
        ? reviewerMap.get(String(leaveRequest.hodReviewedBy ?? leaveRequest.tlReviewedBy ?? ""))?.name ?? null
        : reviewerMap.get(String(leaveRequest.tlReviewedBy ?? leaveRequest.hodReviewedBy ?? ""))?.name ?? null,
    reviewedByRole:
      leaveRequest.status === "approved"
        ? reviewerMap.get(String(leaveRequest.hodReviewedBy ?? leaveRequest.tlReviewedBy ?? ""))?.role ?? null
        : reviewerMap.get(String(leaveRequest.tlReviewedBy ?? leaveRequest.hodReviewedBy ?? ""))?.role ?? null,
    fromDate: leaveRequest.fromDate,
    toDate: leaveRequest.toDate
  })) as ActiveLeaveRequest[];
}

export function getLeaveStatusLabel(status: ActiveLeaveRequest["status"]) {
  if (status === "approved") return "On Leave";
  return "Leave Requested";
}
