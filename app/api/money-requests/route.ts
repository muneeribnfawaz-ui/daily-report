import { NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import db from "@/lib/db";
import { authorizeApi } from "@/lib/api-auth";
import { logAuditEntry } from "@/lib/audit";
import { getINRtoSARRate } from "@/lib/currency";
import { financeReportSchema } from "@/lib/validation";
import { encryptPayload, decryptPayload } from "@/lib/crypto";

export async function GET(request: Request) {
  try {
    const auth = await authorizeApi(["authenticated"]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const where: any = {};
    if (workspaceId && workspaceId !== "all") {
      where.workspaceId = workspaceId;
    }

    const moneyRequests = await db.moneyRequest.findMany({
      where,
      orderBy: { reportDate: "desc" },
      take: 100
    });

    const encryptedData = await encryptPayload(moneyRequests);
    return ApiResponse.success(moneyRequests, "Money requests fetched successfully", 2000, null, 200, encryptedData);
  } catch (error) {
    console.error("Failed to fetch money requests", error);
    return ApiResponse.serverError("Failed to fetch money requests");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeApi(["authenticated"]);
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const rawBody = await request.json();
    let body = rawBody;
    if (rawBody.encryptedData) {
      try {
        body = await decryptPayload(rawBody.encryptedData);
      } catch (err) {
        return ApiResponse.validationError("Failed to decrypt payload");
      }
    }

    const parsed = financeReportSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Money Request Validation Error:", JSON.stringify(parsed.error.issues, null, 2));
      const errorMessage = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') || "Invalid payload";
      return ApiResponse.validationError(errorMessage);
    }

    const exchangeRate = await getINRtoSARRate();
    const reportDateStr = parsed.data.reportDate || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${reportDateStr}T00:00:00.000Z`);

    const workspaceId = parsed.data.workspaceId && parsed.data.workspaceId !== "all" 
      ? parsed.data.workspaceId 
      : user.workspaceId;
    if (!workspaceId) {
      return ApiResponse.validationError("Workspace ID is required");
    }

    const nextDayApprovals = parsed.data.nextDayApprovals || [];
    if (nextDayApprovals.length === 0) {
      return ApiResponse.validationError("At least one money request item is required");
    }

    const createdRequests = [];
    for (const item of nextDayApprovals) {
      const created = await db.moneyRequest.create({
        data: {
          workspaceId,
          submittedBy: user.id,
          submittedByName: user.name,
          reportDate: dayStart,
          particulars: item.particulars || "N/A",
          description: item.description || "",
          amountINR: Number(item.amountINR) || 0,
          amountSAR: (Number(item.amountINR) || 0) * exchangeRate,
          priority: item.priority || "medium",
          bankName: item.bankName || "",
          status: "pending"
        }
      });
      createdRequests.push(created);
    }

    await logAuditEntry({
      action: "Money Request Created",
      userId: user.id,
      userName: user.name,
      newValue: createdRequests
    });

    const encryptedData = await encryptPayload(createdRequests);
    return ApiResponse.created(createdRequests, "Money request submitted successfully!", 2001, 201, encryptedData);
  } catch (error) {
    console.error("Failed to create money request", error);
    return ApiResponse.serverError("Failed to create money request");
  }
}
