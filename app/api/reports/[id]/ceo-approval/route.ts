import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { z } from "zod";

const ceoApprovalSchema = z.object({
  approvalItems: z.array(
    z.object({
      index: z.number().int().min(0),
      reason: z.string().optional(),
      review: z.string().optional(),
      approval: z.enum(["pending", "yes", "no"]).optional()
    })
  )
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ceo") {
    return NextResponse.json(
      { success: false, message: "Only the CEO can approve next day approval items." },
      { status: 403 }
    );
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const parsed = ceoApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid approval payload" },
      { status: 400 }
    );
  }

  const report = await db.dailyReport.findUnique({
    where: { id: String(id) },
    include: { approvalItems: true }
  });
  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  const items = report.approvalItems ?? [];
  if (!items.length) {
    return NextResponse.json(
      { success: false, message: "This report has no approval items." },
      { status: 400 }
    );
  }

  const previousItems = JSON.parse(JSON.stringify(items));

  const updates = [];
  for (const update of parsed.data.approvalItems) {
    if (update.index < 0 || update.index >= items.length) continue;
    const item = items[update.index];
    const dataToUpdate: any = {};
    if (update.reason !== undefined) dataToUpdate.reason = update.reason;
    if (update.review !== undefined) dataToUpdate.review = update.review;
    if (update.approval !== undefined) dataToUpdate.approval = update.approval;
    
    if (Object.keys(dataToUpdate).length > 0) {
       updates.push(db.dailyReportApprovalItem.update({
          where: { id: item.id },
          data: dataToUpdate
       }));
    }
  }

  await db.$transaction(updates);
  
  const updatedReport = await db.dailyReport.findUnique({
    where: { id: report.id },
    include: { approvalItems: true }
  });

  await logAuditEntry({
    action: "CEO Approval Updated",
    userId: user.id,
    userName: user.name,
    reportId: id,
    oldValue: { nextDayApprovalItems: previousItems },
    newValue: { nextDayApprovalItems: updatedReport?.approvalItems }
  });

  return NextResponse.json({
    success: true,
    data: updatedReport,
    message: "Approval decisions saved successfully."
  });
}
