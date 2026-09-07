import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: String(id) }
    }) as any;

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

  const leaveRequest = await db.leaveRequest.findUnique({
    where: { id: String(id) }
  });

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
    const previous = leaveRequest;
    const updatedLeaveRequest = await db.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: { status: "cancelled" }
    });

    await logAuditEntry({
      action: "Leave Request Cancelled",
      userId: user.id,
      userName: user.name,
      leaveRequestId: id,
      oldValue: previous,
      newValue: updatedLeaveRequest
    });

    return NextResponse.json({ success: true, data: updatedLeaveRequest });
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

    const previous = leaveRequest;
    
    const updateData: any = { status: "rejected" };
    if (canRejectPending) {
      updateData.tlReviewedBy = user.id;
      updateData.tlReviewedAt = new Date();
      updateData.tlComment = comment;
    } else {
      updateData.hodReviewedBy = user.id;
      updateData.hodReviewedAt = new Date();
      updateData.hodComment = comment;
    }
    const updatedLeaveRequest = await db.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: updateData
    });

    await logAuditEntry({
      action: "Leave Request Rejected",
      userId: user.id,
      userName: user.name,
      leaveRequestId: id,
      oldValue: previous,
      newValue: updatedLeaveRequest,
      reason: comment || null
    });

    return NextResponse.json({ success: true, data: updatedLeaveRequest });
  }

  if (action === "approve") {
    const canApprovePending = isTeamLeadForRequest && !isOwner && leaveRequest.status === "pending_tl";
    const canApproveFinal = canFinalReview && (leaveRequest.status === "pending_tl" || leaveRequest.status === "forwarded_to_hod");

    if (!canApprovePending && !canApproveFinal) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const previous = leaveRequest;
    
    const updateData: any = { status: "approved" };
    if (canApprovePending) {
      updateData.tlReviewedBy = user.id;
      updateData.tlReviewedAt = new Date();
      updateData.tlComment = comment;
    } else {
      updateData.hodReviewedBy = user.id;
      updateData.hodReviewedAt = new Date();
      updateData.hodComment = comment;
    }
    const updatedLeaveRequest = await db.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: updateData
    });

    await logAuditEntry({
      action: "Leave Request Approved",
      userId: user.id,
      userName: user.name,
      leaveRequestId: id,
      oldValue: previous,
      newValue: updatedLeaveRequest,
      reason: comment || null
    });

    return NextResponse.json({ success: true, data: updatedLeaveRequest });
  }

  return NextResponse.json({ success: false, message: "Unsupported action" }, { status: 400 });
}
