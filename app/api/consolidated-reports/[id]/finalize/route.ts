import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ConsolidatedReport from "@/models/ConsolidatedReport";
import DailyReport from "@/models/DailyReport";
import { logAuditEntry } from "@/lib/audit";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const consolidated = await ConsolidatedReport.findById(id);
  if (!consolidated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  await DailyReport.updateMany(
    { consolidatedReportId: id },
    {
      $set: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: user.id,
        status: "locked"
      }
    }
  );

  consolidated.status = "finalized";
  await consolidated.save();

  await logAuditEntry({
    action: "Consolidated Report Finalized",
    userId: user.id,
    userName: user.name,
    consolidatedReportId: id,
    newValue: { status: "finalized" }
  });

  return NextResponse.json({ success: true, data: consolidated });
}
