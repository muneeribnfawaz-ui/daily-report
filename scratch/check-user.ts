import { connectToDatabase } from "../lib/db";
import User from "../models/User";
async function run() {
  await connectToDatabase();
  const u = await User.findOne({ email: "mason@gmail.com" }).lean();
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
}
run();
