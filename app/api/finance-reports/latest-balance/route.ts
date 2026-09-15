import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFinanceReport } from "@/lib/permissions";
import { encryptPayload } from "@/lib/crypto";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canCreateFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;
    const activeWorkspaceId = workspaceId && workspaceId !== "all" ? workspaceId : user.workspaceId;

    if (!activeWorkspaceId) {
      return NextResponse.json({ success: false, message: "Workspace context is required" }, { status: 400 });
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, activeWorkspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: "Forbidden workspace context" }, { status: 403 });
    }

    // Find the most recently submitted finance report for this workspace
    const latestReport = await db.financeReport.findFirst({
      where: { workspaceId: activeWorkspaceId },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      include: { bankBalances: true }
    });

    const resultData = {
      bankBalances: latestReport?.bankBalances || [],
      lastReportDate: latestReport?.reportDate ?? null
    };

    const encryptedData = await encryptPayload(resultData);
    return NextResponse.json({ 
      success: true, 
      encryptedData,
      data: resultData
    });
  } catch (error) {
    console.error("Failed to fetch latest finance balance", error);
    return NextResponse.json({ success: false, message: "Failed to fetch latest balance" }, { status: 500 });
  }
}
