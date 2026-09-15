import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canAccessBanksAndPettyCash, canCreateFinanceReport } from "@/lib/permissions";
import { withFinanceEncryption, encryptedJsonResponse } from "@/lib/middleware/finance-encryption";
import { encryptDbField, hashForLookup, computeRowSignature, decryptDbField } from "@/lib/crypto/db-encryption";
import { buildWorkspaceFilter, isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, status: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    if (!canAccessBanksAndPettyCash(user) && !canViewFinanceReport(user) && !canCreateFinanceReport(user)) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

    const workspaceFilter = await buildWorkspaceFilter(user, workspaceId);
    const filter: Record<string, any> = { isActive: true, isDeleted: false, ...workspaceFilter };

    let bankAccounts = await db.bankAccount.findMany({
      where: filter,
      orderBy: { bankName: "asc" }
    });

    // Decrypt sensitive fields before returning to client (which handles its own encryption)
    const decryptedAccounts = bankAccounts.map(account => ({
      ...account,
      accountNumber: account.account_last_4 ? `****${account.account_last_4}` : decryptDbField(account.accountNumber)
    }));

    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 1000,
      message: "Bank accounts retrieved successfully",
      data: decryptedAccounts
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error.message || "Failed to fetch bank accounts" }, { status: 500 });
  }
}

async function postHandler(body: any, request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, status: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    if (!canAccessBanksAndPettyCash(user) && !canCreateFinanceReport(user)) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden" }, { status: 403 });
    }

    const { bankName, accountNumber, ifscCode, iban, branchName, product, currency, openingBalance, workspaceId } = body;

    if (!bankName || !accountNumber || !branchName || !ifscCode) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Bank name, account number, branch name, and IFSC code are required" }, { status: 400 });
    }

    // Strict IFSC Validation: 4 letters, 0, 6 alphanumeric
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Invalid IFSC code format. Must be 11 characters (4 letters, a zero, 6 alphanumeric)" }, { status: 400 });
    }

    let activeWorkspaceId = workspaceId && workspaceId !== "all" ? workspaceId : user.workspaceId;
    if (!activeWorkspaceId && user.role !== "admin") {
      const firstMembership = await db.workspaceMember.findFirst({
        where: { userId: user.id, status: "active", isActive: true },
        select: { workspaceId: true }
      });
      activeWorkspaceId = firstMembership?.workspaceId;
    }
    if (!activeWorkspaceId) {
      const firstCompany = await db.workspace.findFirst({ where: { type: "company", isActive: true, isDeleted: false } });
      activeWorkspaceId = firstCompany?.id;
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, activeWorkspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "You do not have permission to add bank accounts to this company/workspace." }, { status: 403 });
    }

    // Encrypt sensitive fields
    const encryptedAccountNumber = encryptDbField(accountNumber);
    const accountLookupHash = hashForLookup(accountNumber);
    const accountLast4 = accountNumber.slice(-4);
    
    // Check for duplicates
    const existingAccount = await db.bankAccount.findFirst({
      where: {
        workspaceId: activeWorkspaceId,
        account_lookup_hash: accountLookupHash,
        isDeleted: false
      }
    });

    if (existingAccount) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "A bank account with this account number already exists in this workspace." }, { status: 400 });
    }

    // We need an ID first to compute row signature properly, or we can use a dummy/uuid up front
    const tempId = crypto.randomUUID();
    const rowSignature = computeRowSignature(tempId, Number(openingBalance) || 0, accountLookupHash, user.id);

    const account = await db.bankAccount.create({ data: {
      id: tempId,
      workspaceId: activeWorkspaceId,
      bankName,
      accountNumber: encryptedAccountNumber,
      account_last_4: accountLast4,
      account_lookup_hash: accountLookupHash,
      row_signature: rowSignature,
      ifscCode: ifscCode || "",
      iban: iban || "",
      branchName: branchName || "",
      product: product || "",
      currency: currency || "INR",
      openingBalance: Number(openingBalance) || 0,
      createdBy: user.id
    } });

    return encryptedJsonResponse({
      success: true,
      status: "SUCCESS",
      statusCode: 2001,
      message: "Bank account created successfully",
      data: {
        ...account,
        accountNumber: `****${accountLast4}`,
        _id: String(account.id),
        workspaceId: String(account.workspaceId),
        createdBy: String(account.createdBy)
      }
    }, (request as any).sessionKey, 201);
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error.message || "Failed to create bank account" }, { status: 500 });
  }
}

export const POST = (req: Request) => withFinanceEncryption(req, postHandler);
