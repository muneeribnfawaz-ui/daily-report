import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";

async function assertPrivilegedUser() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) return null;
  return user;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertPrivilegedUser();
  if (!user) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { id } = await Promise.resolve(params);
    const report = await db.consolidatedReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: report });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertPrivilegedUser();
  if (!user) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const report = await db.consolidatedReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  const previous = report;
  
  const updatedReport = await db.consolidatedReport.update({
    where: { id },
    data: {
      title: body.title !== undefined ? body.title : report.title,
      status: body.status !== undefined ? body.status : report.status,
      remarks: body.remarks !== undefined ? body.remarks : report.remarks
    }
  });

  await logAuditEntry({
    action: "Consolidated Report Updated",
    userId: user.id,
    userName: user.name,
    consolidatedReportId: id,
    oldValue: previous,
    newValue: body
  });

  return NextResponse.json({ success: true, data: updatedReport });
}
