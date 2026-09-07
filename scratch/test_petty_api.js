import db from "./lib/db.js";
import { getOrCreatePettyCash } from "./lib/petty-cash-sync.js";

async function testPettyApi() {
  const activeWorkspaceId = "b45b57e1-4518-4950-9bd9-aa63fa364581";
  console.log("Testing activeWorkspaceId:", activeWorkspaceId);

  let pettyCash = await getOrCreatePettyCash(activeWorkspaceId, "test-user");
  console.log("pettyCash result:", pettyCash);

  const allTransactions = await db.transaction.findMany({
    where: {
      workspaceId: activeWorkspaceId,
      bankName: "Petty Cash",
      isDeleted: false
    }
  });
  console.log("allTransactions count:", allTransactions.length);

  let computedBalance = 0;
  for (const t of allTransactions) {
    if (t.type === "receipt" || t.type === "add") {
      computedBalance += t.amountINR || 0;
    } else if (t.type === "expense" || t.type === "payment") {
      computedBalance -= t.amountINR || 0;
    }
  }
  console.log("computedBalance:", computedBalance);
}

testPettyApi().catch(err => {
  console.error("CATCH ERROR:", err);
}).finally(() => process.exit(0));
