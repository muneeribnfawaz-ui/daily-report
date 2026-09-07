import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_ADMIN_SEED, DEFAULT_TEAM_TYPE_SEEDS } from "@/lib/constants";
let defaultAdminSeeded = false;
let defaultTeamTypesSeeded = false;

export async function ensureDefaultAdmin() {
  if (defaultAdminSeeded) return;

  let admin = await db.user.findFirst({ where: { email: DEFAULT_ADMIN_SEED.email.toLowerCase() } });
  if (!admin) {
    const password = await hashPassword(DEFAULT_ADMIN_SEED.password);
    admin = await db.user.create({
      data: {
        name: DEFAULT_ADMIN_SEED.name,
        email: DEFAULT_ADMIN_SEED.email.toLowerCase(),
        password,
        role: "admin",
        firstName: "Admin",
        lastName: "System",
        isAdminActive: true
      }
    });
  }

  if (!admin) {
    throw new Error("Admin not found or created");
  }

  defaultAdminSeeded = true;
}

export async function ensureDefaultTeamTypes() {
  if (defaultTeamTypesSeeded) return;

  if (DEFAULT_TEAM_TYPE_SEEDS.length > 0) {
    const existingCount = await db.teamType.count();
    if (existingCount === 0) {
      await db.teamType.createMany({ data: DEFAULT_TEAM_TYPE_SEEDS });
    }
  }

  defaultTeamTypesSeeded = true;
}

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: DEFAULT_ADMIN_SEED.email,
  password: DEFAULT_ADMIN_SEED.password
};
