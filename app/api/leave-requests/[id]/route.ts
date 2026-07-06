import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import LeaveRequest from "@/models/LeaveRequest";
import { logAuditEntry } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const leaveRequest = (await LeaveRequest.findById(id).lean()) as
    | {
        employeeId: string;
        teamName: string;
        [key: string]: unknown;
      }
    | null;

  if (!leaveRequest) {
    return NextResponse.json({ success: false, message: "Leave request not found" }, { status: 404 });
  }

  if (user.role === "team_member" && String(leaveRequest.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (user.role === "team_lead" && leaveRequest.teamName !== user.teamName && String(leaveRequest.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: leaveRequest });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  await connectToDatabase();
  const leaveRequest = await LeaveRequest.findById(id);

  if (!leaveRequest) {
    return NextResponse.json({ success: false, message: "Leave request not found" }, { status: 404 });
  }

  const isOwner = String(leaveRequest.employeeId) === user.id;
  const isTeamLeadForRequest = user.role === "team_lead" && leaveRequest.teamName === user.teamName;
  const canFinalReview = user.role === "hod" || user.role === "admin" || user.role === "ceo" || user.role === "report_manager";

  if (action === "cancel") {
    if (!isOwner || (leaveRequest.status !== "pending_tl" && leaveRequest.status !== "forwarded_to_hod")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    const previous = leaveRequest.toObject();
    leaveRequest.status = "cancelled";
    await leaveRequest.save();

    await logAuditEntry({
      action: "Leave Request Cancelled",
      userId: user.id,
      userName: user.name,
      leaveRequestId: id,
      oldValue: previous,
      newValue: leaveRequest.toObject()
    });

    return NextResponse.json({ success: true, data: leaveRequest });
  }

  if (action === "reject") {
    const canRejectPending = isTeamLeadForRequest && !isOwner && leaveRequest.status === "pending_tl";
    const canRejectFinal = canFinalReview && (leaveRequest.status === "pending_tl" || leaveRequest.status === "forwarded_to_hod");

    if (!canRejectPending && !canRejectFinal) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (!comment) {
      return NextResponse.json({ success: false, message: "Rejection description is required" }, { status: 400 });
    }

    const previous = leaveRequest.toObject();
    leaveRequest.status = "rejected";
    if (canRejectPending) {
      leaveRequest.tlReviewedBy = user.id;
      leaveRequest.tlReviewedAt = new Date();
      leaveRequest.tlComment = comment;
    } else {
      leaveRequest.hodReviewedBy = user.id;
      leaveRequest.hodReviewedAt = new Date();
      leaveRequest.hodComment = comment;
    }
    await leaveRequest.save();

    await logAuditEntry({
      action: "Leave Request Rejected",
      userId: user.id,
      userName: user.name,
      leaveRequestId: id,
      oldValue: previous,
      newValue: leaveRequest.toObject(),
      reason: comment || null
    });

    return NextResponse.json({ success: true, data: leaveRequest });
  }

  if (action === "approve") {
    const canApprovePending = isTeamLeadForRequest && !isOwner && leaveRequest.status === "pending_tl";
    const canApproveFinal = canFinalReview && (leaveRequest.status === "pending_tl" || leaveRequest.status === "forwarded_to_hod");

    if (!canApprovePending && !canApproveFinal) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const previous = leaveRequest.toObject();
    leaveRequest.status = "approved";
    if (canApprovePending) {
      leaveRequest.tlReviewedBy = user.id;
      leaveRequest.tlReviewedAt = new Date();
      leaveRequest.tlComment = comment;
    } else {
      leaveRequest.hodReviewedBy = user.id;
      leaveRequest.hodReviewedAt = new Date();
      leaveRequest.hodComment = comment;
    }
    await leaveRequest.save();

    await logAuditEntry({
      action: "Leave Request Approved",
      userId: user.id,
      userName: user.name,
      leaveRequestId: id,
      oldValue: previous,
      newValue: leaveRequest.toObject(),
      reason: comment || null
    });

    return NextResponse.json({ success: true, data: leaveRequest });
  }

  return NextResponse.json({ success: false, message: "Unsupported action" }, { status: 400 });
}
