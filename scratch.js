const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst();
    const ws = await prisma.workspace.findFirst();
    console.log("User:", user.id, "WS:", ws.id);
    
    // test petty cash logic
    let pettyCash = await prisma.pettyCash.findFirst({ where: { workspaceId: ws.id, isDeleted: false } });
    if (!pettyCash) {
      console.log("creating petty cash...");
      pettyCash = await prisma.pettyCash.create({ data: { workspaceId: ws.id, balance: 0, createdBy: user.id } });
    }
    
    console.log("Petty Cash:", pettyCash.id);
    
    const transaction = await prisma.transaction.create({ data: {
      workspaceId: ws.id,
      financeReportId: null,
      type: "receipt",
      particulars: "Petty Cash Top-up",
      description: "Test",
      amountINR: 100,
      amountSAR: 4.28,
      bankName: "Petty Cash",
      paymentMode: "Cash",
      createdBy: user.id
    } });
    
    console.log("Transaction created:", transaction.id);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
