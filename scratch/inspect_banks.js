import db from "./lib/db.js";

async function inspectBanks() {
  const bankAccounts = await db.bankAccount.findMany({});
  console.log("=== Registered Bank Accounts ===");
  for (const b of bankAccounts) {
    console.log(`Bank: ${b.bankName}, last4: ${b.account_last_4}, openingBalance: ${b.openingBalance}`);
  }

  const reports = await db.financeReport.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { bankBalances: true, items: true }
  });

  console.log("\n=== Latest Finance Reports ===");
  for (const r of reports) {
    console.log(`Report ID: ${r.id}, Date: ${r.reportDate}`);
    console.log("Bank Balances:");
    for (const bb of r.bankBalances) {
      console.log(`  - ${bb.bankName}: OB=${bb.openingBalance}, Rec=${bb.receipts}, Pay=${bb.payments}, CB=${bb.closingBalance}`);
    }
    console.log("Receipts/Payments/Expenses items:");
    for (const item of r.items) {
      console.log(`  - type: ${item.type}, bank: ${item.bankName}, mode: ${item.paymentMode}, amt: ${item.amountINR}, particular: ${item.particulars}`);
    }
  }
}

inspectBanks().catch(console.error).finally(() => process.exit(0));
