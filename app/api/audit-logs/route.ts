import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";
import WorkspaceMember from "@/models/WorkspaceMember";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo" && user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

  await connectToDatabase();
  const filter: Record<string, any> = {};

  if (user.role !== "admin") {
    const memberships = await WorkspaceMember.find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as any[];
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { $in: allowedWorkspaceIds };
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }
  }

  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: logs });
}
