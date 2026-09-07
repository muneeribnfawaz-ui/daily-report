import db from "./lib/db.js";
import { syncReportCashToPettyCash } from "./lib/petty-cash-sync.js";

async function syncAll() {
  const reports = await db.financeReport.findMany({ select: { id: true } });
  console.log(`Found ${reports.length} reports to sync...`);
  for (const r of reports) {
    await syncReportCashToPettyCash(r.id);
  }
  console.log("Sync complete!");
}

syncAll().catch(console.error).finally(() => process.exit(0));
