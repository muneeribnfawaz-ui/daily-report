import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptDbField } from "@/lib/crypto/db-encryption";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, status: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    }

    // Only Admin & CEO can approve or reject bank edit requests
    const isHigherAuthority = user.role === "admin" || user.role === "ceo";
    if (!isHigherAuthority) {
      return NextResponse.json({
        success: false,
        status: "FORBIDDEN",
        message: "Only higher authority (Admin or CEO) can approve or reject bank edit requests"
      }, { status: 403 });
    }

    const { id } = await params;
    const bank = await db.bankAccount.findUnique({ where: { id } });
    if (!bank || bank.isDeleted) {
      return NextResponse.json({ success: false, status: "NOT_FOUND", message: "Bank account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body; // 'approve' | 'reject'

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    if (action === "approve") {
      const pending = bank.pendingEdits as any;
      if (!pending) {
        return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "No pending edits found for this bank account" }, { status: 400 });
      }

      const plainAcct = pending.accountNumber ? String(pending.accountNumber).trim() : "";
      const encryptedAcct = plainAcct ? encryptDbField(plainAcct) : bank.accountNumber;
      const last4 = plainAcct ? plainAcct.slice(-4) : bank.account_last_4;

      const updatedBank = await db.bankAccount.update({
        where: { id },
        data: {
          bankName: pending.bankName || bank.bankName,
          accountNumber: encryptedAcct,
          account_last_4: last4,
          branchName: pending.branchName !== undefined ? pending.branchName : bank.branchName,
          ifscCode: pending.ifscCode !== undefined ? pending.ifscCode : bank.ifscCode,
          product: pending.product !== undefined ? pending.product : bank.product,
          openingBalance: pending.openingBalance !== undefined ? Number(pending.openingBalance) : bank.openingBalance,
          editStatus: "approved",
          pendingEdits: null as any,
          editReason: null,
          editRequestedBy: null
        }
      });

      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        statusCode: 1000,
        message: "Bank edit request approved successfully",
        data: updatedBank
      });
    } else {
      // Reject action
      const updatedBank = await db.bankAccount.update({
        where: { id },
        data: {
          editStatus: "rejected",
          pendingEdits: null as any
        }
      });

      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        statusCode: 1000,
        message: "Bank edit request rejected",
        data: updatedBank
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error.message || "Failed to process bank edit approval" }, { status: 500 });
  }
}
