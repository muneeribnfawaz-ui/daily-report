import db from "./lib/db.js";
import { syncReportCashToPettyCash } from "./lib/petty-cash-sync.js";

async function repair() {
  console.log("Resetting transactions linked to finance reports...");
  
  // Find all petty cash accounts
  const pettyCashAccounts = await db.pettyCash.findMany();
  for (const pc of pettyCashAccounts) {
    // Reset balance to direct (non-report) transactions sum
    const directTxns = await db.transaction.findMany({
      where: { workspaceId: pc.workspaceId, financeReportId: null }
    });
    let directBalance = 0;
    for (const t of directTxns) {
      if (t.type === "receipt") directBalance += t.amountINR;
      else directBalance -= t.amountINR;
    }
    await db.pettyCash.update({
      where: { id: pc.id },
      data: { balance: directBalance }
    });
  }

  // Delete all transactions linked to finance reports
  await db.transaction.deleteMany({
    where: { financeReportId: { not: null } }
  });

  // Re-sync all reports cleanly
  const reports = await db.financeReport.findMany({ select: { id: true } });
  console.log(`Re-syncing ${reports.length} reports...`);
  for (const r of reports) {
    await syncReportCashToPettyCash(r.id);
  }

  console.log("Repair finished successfully!");
}

repair().catch(console.error).finally(() => process.exit(0));
