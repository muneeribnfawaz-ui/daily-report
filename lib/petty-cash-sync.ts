import db from "@/lib/db";

export async function getOrCreatePettyCash(workspaceId: string, createdBy?: string) {
  try {
    let pettyCash = await db.pettyCash.findFirst({
      where: { workspaceId }
    });

    if (!pettyCash) {
      const wsExists = await db.workspace.findUnique({ where: { id: workspaceId } });
      if (!wsExists) {
        return null;
      }

      try {
        pettyCash = await db.pettyCash.create({
          data: { workspaceId, balance: 0, createdBy }
        });
      } catch {
        pettyCash = await db.pettyCash.findFirst({ where: { workspaceId } });
      }
    }

    if (pettyCash && pettyCash.isDeleted) {
      try {
        pettyCash = await db.pettyCash.update({
          where: { id: pettyCash.id },
          data: { isDeleted: false }
        });
      } catch {
        // Postgres trigger guard for historical records
      }
    }

    return pettyCash;
  } catch (err) {
    console.error("Error in getOrCreatePettyCash:", err);
    return null;
  }
}

function isPettyCashItem(item: any): boolean {
  const bankName = item.bankName ? item.bankName.trim().toLowerCase() : "";
  const paymentMode = item.paymentMode ? item.paymentMode.trim().toLowerCase() : "";

  if (bankName && bankName !== "cash") {
    return false;
  }

  if (bankName === "cash") {
    return true;
  }

  if (item.type === "receipt") {
    return paymentMode === "cash" || paymentMode === "transfer_to_cash";
  }
  if (item.type === "expense" || item.type === "payment") {
    return paymentMode === "cash";
  }

  return false;
}

export async function syncReportCashToPettyCash(reportId: string) {
  try {
    const report = await db.financeReport.findUnique({
      where: { id: reportId },
      include: { items: true }
    });
    if (!report) return;

    const cashItems = (report.items as any[]).filter(isPettyCashItem);

    const pettyCash = await getOrCreatePettyCash(report.workspaceId, report.submittedBy);
    if (!pettyCash) return;

    // Delete previously synced transactions for this financeReportId to handle updates cleanly
    const existingTxns = await db.transaction.findMany({
      where: { financeReportId: report.id }
    });

    let oldNetChange = 0;
    for (const txn of existingTxns) {
      if (txn.type === "receipt") {
        oldNetChange += txn.amountINR;
      } else if (txn.type === "expense" || txn.type === "payment") {
        oldNetChange -= txn.amountINR;
      }
    }

    if (existingTxns.length > 0) {
      await db.transaction.deleteMany({ where: { financeReportId: report.id } });
    }

    let newNetChange = 0;
    if (cashItems.length > 0) {
      const transactionPromises = cashItems.map(item => {
        if (item.type === "receipt") {
          newNetChange += item.amountINR;
        } else if (item.type === "expense" || item.type === "payment") {
          newNetChange -= item.amountINR;
        }

        return db.transaction.create({
          data: {
            workspaceId: report.workspaceId,
            financeReportId: report.id,
            type: item.type,
            particulars: item.particulars || "Cash Transaction",
            description: item.description || "",
            amountINR: item.amountINR || 0,
            amountSAR: item.amountSAR || 0,
            bankName: "Petty Cash",
            paymentMode: "Cash",
            createdBy: report.submittedBy,
            createdAt: report.reportDate
          }
        });
      });

      await Promise.all(transactionPromises);
    }

    const diff = newNetChange - oldNetChange;
    if (diff !== 0) {
      try {
        await db.pettyCash.update({
          where: { id: pettyCash.id },
          data: { balance: pettyCash.balance + diff }
        });
      } catch {
        // Postgres trigger guard for historical records
      }
    }
  } catch (error) {
    console.error("Error in syncReportCashToPettyCash:", error);
  }
}
