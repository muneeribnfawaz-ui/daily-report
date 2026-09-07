import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
    await db.dailyReport.updateMany({
      where: { consolidatedReportId: id },
      data: { isLocked: true, lockedAt: new Date(), lockedBy: user.id, status: "locked" }
    });

  await logAuditEntry({
    action: "Report Locked",
    userId: user.id,
    userName: user.name,
    consolidatedReportId: id
  });

  return NextResponse.json({ success: true, data: { id, locked: true } });
}
