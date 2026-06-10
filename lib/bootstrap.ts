import { connectToDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import TeamType from "@/models/TeamType";
import { DEFAULT_ADMIN_SEED, DEFAULT_TEAM_TYPE_SEEDS } from "@/lib/constants";

let defaultAdminSeeded = false;
let defaultTeamTypesSeeded = false;

export async function ensureDefaultAdmin() {
  if (defaultAdminSeeded) return;

  await connectToDatabase();
  const existing = await User.findOne({ email: DEFAULT_ADMIN_SEED.email }).lean();
  if (!existing) {
    const password = await hashPassword(DEFAULT_ADMIN_SEED.password);
    await User.create({
      ...DEFAULT_ADMIN_SEED,
      email: DEFAULT_ADMIN_SEED.email.toLowerCase(),
      role: "admin",
      password
    });
  }

  defaultAdminSeeded = true;
}

export async function ensureDefaultTeamTypes() {
  if (defaultTeamTypesSeeded) return;

  await connectToDatabase();
  const existingCount = await TeamType.countDocuments();
  if (existingCount === 0) {
    await TeamType.insertMany(DEFAULT_TEAM_TYPE_SEEDS);
  }

  defaultTeamTypesSeeded = true;
}

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: DEFAULT_ADMIN_SEED.email,
  password: DEFAULT_ADMIN_SEED.password
};
