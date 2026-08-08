import { config } from "dotenv";
config({ path: ".env.local" });
import { connectToDatabase } from "../lib/db";
import User from "../models/User";
async function run() {
  await connectToDatabase();
  await User.updateOne({ email: "mason@gmail.com" }, { $set: { departments: [{ name: "Construction", subTeams: [] }] } });
  console.log("Fixed mason@gmail.com");
  process.exit(0);
}
run();
