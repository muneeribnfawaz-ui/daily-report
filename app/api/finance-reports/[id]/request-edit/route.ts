import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { encryptPayload, decryptPayload } from "@/lib/crypto";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rawBody = await request.json().catch(() => ({}));
  let body = rawBody;
  if (rawBody.encryptedData) {
    try {
      body = await decryptPayload(rawBody.encryptedData);
    } catch (err) {
      return NextResponse.json({ success: false, message: "Failed to decrypt payload" }, { status: 400 });
    }
  }

  const report = await db.financeReport.findUnique({ where: { id: String(id) } });
  if (!report) {
    return NextResponse.json({ success: false, message: "Finance Report not found" }, { status: 404 });
  }

  const isAuthorized = await isWorkspaceAuthorizedForUser(user, report.workspaceId);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (String(report.submittedBy) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (report.status !== "pending") {
    return NextResponse.json({ success: false, message: "Only pending reports can have edit requests." }, { status: 423 });
  }

  if (report.editAccessGranted) {
    const encryptedData = await encryptPayload(report);
    return NextResponse.json({ success: true, encryptedData, data: report, message: "Edit access is already available." });
  }

  const updatedReport = await db.financeReport.update({
    where: { id: report.id },
    data: {
      editAccessRequested: true,
      editAccessRequestReason: typeof body.reason === "string" ? body.reason.trim() : "",
      editAccessRequestedAt: new Date()
    }
  });

  await logAuditEntry({
    action: "Finance Report Edit Requested",
    userId: user.id,
    userName: user.name,
    reportId: id,
    newValue: {
      editAccessRequested: true,
      editAccessRequestReason: updatedReport.editAccessRequestReason
    }
  });

  const encryptedData = await encryptPayload(updatedReport);
  return NextResponse.json({ success: true, encryptedData, data: updatedReport, message: "Edit request sent to your senior." });
}
