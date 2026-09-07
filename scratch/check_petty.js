import db from "./lib/db.js";

async function check() {
  const reports = await db.financeReport.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { items: true, bankBalances: true }
  });

  console.log("Reports count:", reports.length);
  for (const r of reports) {
    console.log(`Report ID: ${r.id}, Status: ${r.status}, Date: ${r.reportDate}`);
    const cashItems = r.items.filter((item) => 
      (item.bankName && item.bankName.trim().toLowerCase() === "cash") || 
      (item.paymentMode && item.paymentMode.trim().toLowerCase() === "cash") ||
      item.paymentMode === "transfer_to_cash"
    );
    console.log(`  Cash items count: ${cashItems.length}`);
    for (const item of cashItems) {
      console.log(`    - type: ${item.type}, particulars: ${item.particulars}, amountINR: ${item.amountINR}, bankName: ${item.bankName}, paymentMode: ${item.paymentMode}`);
    }
  }

  const pettyCash = await db.pettyCash.findMany({});
  console.log("Petty Cash Records:", pettyCash);

  const transactions = await db.transaction.findMany({});
  console.log("Transactions count:", transactions.length);
}

check().catch(console.error).finally(() => process.exit(0));
