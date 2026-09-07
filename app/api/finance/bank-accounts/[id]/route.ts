import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessBanksAndPettyCash } from "@/lib/permissions";
import { encryptDbField, decryptDbField } from "@/lib/crypto/db-encryption";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, status: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessBanksAndPettyCash(user)) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const bank = await db.bankAccount.findUnique({ where: { id } });
    if (!bank || bank.isDeleted) {
      return NextResponse.json({ success: false, status: "NOT_FOUND", message: "Bank account not found" }, { status: 4404 });
    }

    let plainAccount = "";
    try {
      plainAccount = decryptDbField(bank.accountNumber || "");
    } catch {
      plainAccount = bank.accountNumber || "";
    }

    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 1000,
      data: {
        ...bank,
        accountNumber: plainAccount
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error.message || "Failed to fetch bank account" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, status: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessBanksAndPettyCash(user)) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existingBank = await db.bankAccount.findUnique({ where: { id } });
    if (!existingBank || existingBank.isDeleted) {
      return NextResponse.json({ success: false, status: "NOT_FOUND", message: "Bank account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { bankName, accountNumber, branchName, ifscCode, product, openingBalance, editReason } = body;

    if (!bankName || !bankName.trim()) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Bank Name is required" }, { status: 400 });
    }

    const isHigherAuthority = user.role === "admin" || user.role === "ceo";
    const plainAcct = accountNumber ? String(accountNumber).trim() : "";
    const encryptedAcct = plainAcct ? encryptDbField(plainAcct) : existingBank.accountNumber;
    const last4 = plainAcct ? plainAcct.slice(-4) : existingBank.account_last_4;
    const parsedOpeningBal = openingBalance !== undefined && openingBalance !== null ? Number(openingBalance) : existingBank.openingBalance;

    if (isHigherAuthority) {
      // Immediate edit for Admin & CEO
      const updatedBank = await db.bankAccount.update({
        where: { id },
        data: {
          bankName: bankName.trim(),
          accountNumber: encryptedAcct,
          account_last_4: last4,
          branchName: branchName ? branchName.trim() : "",
          ifscCode: ifscCode ? ifscCode.trim() : "",
          product: product ? product.trim() : "",
          openingBalance: isNaN(parsedOpeningBal) ? 0 : parsedOpeningBal,
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
        message: "Bank account details updated successfully",
        data: updatedBank
      });
    } else {
      // Non-admin roles submit an Edit Request requiring approval
      const proposedEdits = {
        bankName: bankName.trim(),
        accountNumber: plainAcct || existingBank.accountNumber,
        branchName: branchName ? branchName.trim() : "",
        ifscCode: ifscCode ? ifscCode.trim() : "",
        product: product ? product.trim() : "",
        openingBalance: isNaN(parsedOpeningBal) ? 0 : parsedOpeningBal
      };

      const updatedBank = await db.bankAccount.update({
        where: { id },
        data: {
          editStatus: "pending_approval",
          pendingEdits: proposedEdits,
          editReason: editReason ? editReason.trim() : "Edit requested by finance user",
          editRequestedBy: user.id
        }
      });

      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        statusCode: 1000,
        message: "Edit request submitted successfully. Awaiting higher authority approval.",
        data: updatedBank
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error.message || "Failed to update bank account" }, { status: 500 });
  }
}
