import db from "./lib/db.js";

async function inspectOne() {
  const bankId = "f8f743d4-6690-4323-9aff-2037e3bbe9de";
  const bank = await db.bankAccount.findUnique({ where: { id: bankId } });
  console.log("=== Bank Record ===");
  console.log(bank);

  const reports = await db.financeReport.findMany({
    where: { workspaceId: bank.workspaceId },
    include: { bankBalances: true, items: true }
  });

  console.log("\n=== Reports for Workspace ===");
  for (const r of reports) {
    console.log(`Report ID: ${r.id}, Date: ${r.reportDate}`);
    for (const b of r.bankBalances) {
      console.log(`  BankBalance row: ${b.bankName} => OB=${b.openingBalance}, Rec=${b.receipts}, Pay=${b.payments}, CB=${b.closingBalance}`);
    }
    for (const item of r.items) {
      console.log(`  Item: type=${item.type}, bankName=${item.bankName}, mode=${item.paymentMode}, amt=${item.amountINR}, particular=${item.particulars}`);
    }
  }
}

inspectOne().catch(console.error).finally(() => process.exit(0));
