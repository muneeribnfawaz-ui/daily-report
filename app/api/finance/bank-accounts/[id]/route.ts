import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessBanksAndPettyCash } from "@/lib/permissions";
import { encryptDbField, decryptDbField } from "@/lib/crypto/db-encryption";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

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

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, bank.workspaceId);
    if (!isAuthorized) {
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

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, existingBank.workspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden: You cannot modify a bank account from another company/workspace." }, { status: 403 });
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

      // Notify Admin and CEO users with access to this workspace
      try {
        const approverIds = new Set<string>();

        // 1. All active admins
        const adminUsers = await db.user.findMany({
          where: { role: "admin", isDeleted: false },
          select: { id: true }
        });
        adminUsers.forEach((a) => approverIds.add(a.id));

        // 2. CEOs with active membership in this workspace or its owner workspace
        const companyWorkspace = await db.workspace.findUnique({
          where: { id: existingBank.workspaceId },
          select: { ownerWorkspaceId: true }
        });
        const relevantWorkspaceIds = [existingBank.workspaceId];
        if (companyWorkspace?.ownerWorkspaceId) {
          relevantWorkspaceIds.push(companyWorkspace.ownerWorkspaceId);
        }

        const ceoMemberships = await db.workspaceMember.findMany({
          where: {
            workspaceId: { in: relevantWorkspaceIds },
            role: "ceo",
            status: "active",
            isActive: true,
            user: { isDeleted: false }
          },
          select: { userId: true }
        });
        ceoMemberships.forEach((m) => approverIds.add(m.userId));

        // Exclude the submitter
        approverIds.delete(user.id);

        if (approverIds.size > 0) {
          const approverIdsList = Array.from(approverIds);

          // Prevent duplicate unread pending notifications
          const existingNotifs = await db.notification.findMany({
            where: {
              recipientId: { in: approverIdsList },
              type: "bank_edit_request_pending",
              linkUrl: `/finance/banks/${id}`,
              isRead: false
            },
            select: { recipientId: true }
          });
          const alreadyNotifiedRecipients = new Set(existingNotifs.map((n) => n.recipientId));
          const recipientsToNotify = approverIdsList.filter((recId) => !alreadyNotifiedRecipients.has(recId));

          if (recipientsToNotify.length > 0) {
            const notificationsToCreate = recipientsToNotify.map((recId) => ({
              recipientId: recId,
              type: "bank_edit_request_pending",
              title: "Bank Account Edit Request",
              message: `${user.name} has requested edits for bank account "${bankName.trim()}". Reason: "${editReason ? editReason.trim() : "Edit requested by finance user"}"`,
              metadata: {
                bankAccountId: id,
                bankName: bankName.trim(),
                requestedBy: user.name,
                requestedById: user.id
              },
              linkUrl: `/finance/banks/${id}`
            }));

            await db.notification.createMany({ data: notificationsToCreate });
          }
        }
      } catch (notifErr) {
        console.error("Failed to create bank edit request notifications:", notifErr);
      }

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
