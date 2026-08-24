import { connectToDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import WorkspaceMember from "@/models/WorkspaceMember";
import TeamType from "@/models/TeamType";
import { DEFAULT_ADMIN_SEED, DEFAULT_TEAM_TYPE_SEEDS } from "@/lib/constants";

let defaultAdminSeeded = false;
let defaultTeamTypesSeeded = false;

export async function ensureDefaultAdmin() {
  if (defaultAdminSeeded) return;

  await connectToDatabase();

  let admin = await User.findOne({ email: DEFAULT_ADMIN_SEED.email.toLowerCase() }).lean();
  if (!admin) {
    const password = await hashPassword(DEFAULT_ADMIN_SEED.password);
    admin = await User.create({
      ...DEFAULT_ADMIN_SEED,
      firstName: "Admin",
      lastName: "System",
      email: DEFAULT_ADMIN_SEED.email.toLowerCase(),
      password,
      role: "admin",
      isAdminActive: true
    });
  }

  if (!admin) {
    throw new Error("Admin not found or created");
  }

  defaultAdminSeeded = true;
}

export async function ensureDefaultTeamTypes() {
  if (defaultTeamTypesSeeded) return;

  await connectToDatabase();
  if (DEFAULT_TEAM_TYPE_SEEDS.length > 0) {
    const existingCount = await TeamType.countDocuments();
    if (existingCount === 0) {
      await TeamType.insertMany(DEFAULT_TEAM_TYPE_SEEDS);
    }
  }

  defaultTeamTypesSeeded = true;
}

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: DEFAULT_ADMIN_SEED.email,
  password: DEFAULT_ADMIN_SEED.password
};
