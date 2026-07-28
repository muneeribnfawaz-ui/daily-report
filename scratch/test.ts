import { connectToDatabase } from "../lib/db";
import User from "../models/User";

async function run() {
  await connectToDatabase();
  const FINANCE_TEAM_INTERNAL_NAME = "FINANCE_TEAM";
  const financeHods = await User.find({
    role: "hod",
    $or: [
      { teamNames: FINANCE_TEAM_INTERNAL_NAME },
      { teamName: FINANCE_TEAM_INTERNAL_NAME },
      { "departments.name": "Finance" },
      { "departments.name": FINANCE_TEAM_INTERNAL_NAME }
    ],
    status: "active",
    isDeleted: false
  }).lean();
  console.log("financeHods length:", financeHods.length);
  console.log("financeHods:", financeHods.map(u => u._id));
  process.exit(0);
}

run().catch(console.error);
