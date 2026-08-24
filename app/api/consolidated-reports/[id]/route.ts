import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ConsolidatedReport from "@/models/ConsolidatedReport";
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
  await connectToDatabase();
  const report = await ConsolidatedReport.findById(id).lean();
  if (!report) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: report });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertPrivilegedUser();
  if (!user) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  await connectToDatabase();
  const report = await ConsolidatedReport.findById(id);
  if (!report) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  const previous = report.toObject();
  Object.assign(report, body);
  await report.save();

  await logAuditEntry({
    action: "Consolidated Report Updated",
    userId: user.id,
    userName: user.name,
    consolidatedReportId: id,
    oldValue: previous,
    newValue: body
  });

  return NextResponse.json({ success: true, data: report });
}
