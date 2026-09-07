import db from "./lib/db.js";
import { syncReportCashToPettyCash } from "./lib/petty-cash-sync.js";

async function main() {
  console.log("Cleaning and resyncing all petty cash transactions...");

  // Delete all report-linked transactions
  await db.transaction.deleteMany({
    where: { financeReportId: { not: null } }
  });

  // Reset petty cash balances to direct-entry transactions sum
  const pettyCashList = await db.pettyCash.findMany();
  for (const pc of pettyCashList) {
    const directTxns = await db.transaction.findMany({
      where: { workspaceId: pc.workspaceId, financeReportId: null }
    });
    let directBal = 0;
    for (const t of directTxns) {
      if (t.type === "receipt") directBal += t.amountINR;
      else directBal -= t.amountINR;
    }
    await db.pettyCash.update({
      where: { id: pc.id },
      data: { balance: directBal }
    });
  }

  // Re-sync all finance reports cleanly
  const reports = await db.financeReport.findMany({ select: { id: true } });
  for (const r of reports) {
    await syncReportCashToPettyCash(r.id);
  }

  // Log final petty cash balance
  const finalPetty = await db.pettyCash.findMany();
  console.log("Final Petty Cash Balances:", finalPetty);
}

main().catch(console.error).finally(() => process.exit(0));
