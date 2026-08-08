import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import User from "../models/User";
import { canViewFinanceReport } from "../lib/permissions";
import { SessionUser } from "../lib/types";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

async function testPermissions() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    const users = await User.find().lean();
    for (const u of users) {
      const sessionUser = {
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        teamName: u.teamName,
        teamNames: u.teamNames ?? [],
        departments: u.departments ?? [],
        status: u.status
      } as SessionUser;

      const canView = canViewFinanceReport(sessionUser);
      console.log(`User: ${u.email} | Role: ${u.role} | Depts: ${JSON.stringify(u.departments)} | Teams: ${u.teamNames} | canViewFinanceReport: ${canView}`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

testPermissions();
