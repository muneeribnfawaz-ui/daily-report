import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo" && user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const logs = await AuditLog.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: logs });
}
