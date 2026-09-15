import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessBanksAndPettyCash } from "@/lib/permissions";
import { getOrCreatePettyCash } from "@/lib/petty-cash-sync";
import { buildWorkspaceFilter, isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, status: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessBanksAndPettyCash(user)) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

    const workspaceFilter = await buildWorkspaceFilter(user, workspaceId);

    const transactionFilter: any = {
      bankName: "Petty Cash",
      isDeleted: false,
      ...workspaceFilter
    };

    const transactions = await db.transaction.findMany({
      where: transactionFilter,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    let computedBalance = 0;
    for (const t of transactions) {
      if (t.type === "receipt" || (t as any).type === "add") {
        computedBalance += t.amountINR || 0;
      } else if (t.type === "expense" || t.type === "payment") {
        computedBalance -= t.amountINR || 0;
      }
    }

    const userIds = Array.from(new Set(transactions.map((t: any) => t.createdBy).filter(Boolean)));
    const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds as string[] } }, select: { id: true, name: true } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 1000,
      message: "Petty cash retrieved successfully",
      data: {
        balance: computedBalance,
        transactions: transactions.map((t: any) => ({
          ...t,
          _id: String(t.id),
          workspaceId: String(t.workspaceId),
          performedBy: String(t.createdBy),
          performedByName: userMap.get(String(t.createdBy)) || "Finance User",
          type: t.type === "receipt" ? "add" : "expense",
          amount: t.amountINR,
          particulars: t.particulars || (t.type === "receipt" ? "Petty Cash Top-up" : "Petty Cash Expense"),
          date: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
          createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString()
        }))
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error.message || "Failed to retrieve petty cash data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, status: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessBanksAndPettyCash(user)) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, amount, description, date, workspaceId } = body;

    if (!type || !["add", "expense"].includes(type)) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Invalid transaction type" }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Amount must be a positive number" }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Description is required" }, { status: 400 });
    }

    const headerWorkspaceId = request.headers.get("x-workspace-id");
    const rawWorkspaceId = workspaceId || headerWorkspaceId;
    const activeWorkspaceId = rawWorkspaceId && rawWorkspaceId !== "all" ? rawWorkspaceId : user.workspaceId;

    if (!activeWorkspaceId) {
      return NextResponse.json({ success: false, status: "VALIDATION_ERROR", message: "Workspace context is required" }, { status: 400 });
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, activeWorkspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, status: "FORBIDDEN", message: "Forbidden workspace context" }, { status: 403 });
    }

    let pettyCash = await getOrCreatePettyCash(activeWorkspaceId, user.id);
    if (!pettyCash) {
      return NextResponse.json({ success: false, status: "ERROR", message: "Failed to initialize petty cash account" }, { status: 500 });
    }

    if (type === "expense" && pettyCash.balance < parsedAmount) {
      return NextResponse.json(
        {
          success: false,
          status: "VALIDATION_ERROR",
          message: `Insufficient petty cash balance. Current balance is ${pettyCash.balance} INR.`
        },
        { status: 400 }
      );
    }

    try {
      pettyCash = await db.pettyCash.update({
        where: { id: pettyCash.id },
        data: {
          balance: type === "add" ? pettyCash.balance + parsedAmount : pettyCash.balance - parsedAmount
        }
      });
    } catch {
      // Postgres trigger guard for historical records
    }

    const transaction = await db.transaction.create({
      data: {
        workspaceId: activeWorkspaceId,
        financeReportId: null,
        type: type === "add" ? "receipt" : "expense",
        particulars: type === "add" ? "Petty Cash Top-up" : "Petty Cash Expense",
        description,
        amountINR: parsedAmount,
        amountSAR: parsedAmount * 0.0428,
        bankName: "Petty Cash",
        paymentMode: "Cash",
        createdBy: user.id,
        createdAt: date ? new Date(date) : undefined
      }
    });

    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 2001,
      message: `Petty cash transaction recorded successfully`,
      data: {
        balance: pettyCash.balance,
        transaction: {
          ...transaction,
          _id: String(transaction.id),
          workspaceId: String(transaction.workspaceId),
          performedBy: String(user.id),
          performedByName: user.name,
          type: type,
          amount: transaction.amountINR,
          date: transaction.createdAt ? transaction.createdAt.toISOString() : new Date().toISOString(),
          createdAt: transaction.createdAt ? transaction.createdAt.toISOString() : new Date().toISOString()
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error.message || "Failed to record transaction" }, { status: 500 });
  }
}
