import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json().catch(() => ({}));
    const report = await db.dailyReport.update({
    where: { id: String(id) },
    data: {
      status: "rejected",
      rejectionReason: body.rejectionReason ?? "Rejected by manager"
    }
  });

  if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });

  await logAuditEntry({
    action: "Report Rejected",
    userId: user.id,
    userName: user.name,
    reportId: id,
    newValue: { status: "rejected", rejectionReason: body.rejectionReason ?? "Rejected by manager" }
  });

  return NextResponse.json({ success: true, data: report });
}
