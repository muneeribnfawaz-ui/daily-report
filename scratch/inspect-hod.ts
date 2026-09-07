import "dotenv/config";
import db from "../lib/db";

async function checkHodData() {
  const users = await db.user.findMany({ select: { id: true, name: true, role: true, email: true } });
  console.log("=== ALL USERS ===");
  console.log(JSON.stringify(users, null, 2));

  const members = await db.workspaceMember.findMany({ select: { userId: true, role: true, workspaceId: true } });
  console.log("\n=== ALL WORKSPACE MEMBERS ===");
  console.log(JSON.stringify(members, null, 2));

  const reports = await db.dailyReport.findMany({
    take: 20,
    select: { id: true, employeeId: true, name: true, verificationLevel: true, workspaceId: true }
  });
  console.log("\n=== RECENT DAILY REPORTS ===");
  console.log(JSON.stringify(reports, null, 2));
}

checkHodData().catch(console.error);
