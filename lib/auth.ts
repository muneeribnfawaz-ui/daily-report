import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import db from "@/lib/db";
import type { SessionUser } from "@/lib/types";
import { normalizeRole } from "@/lib/constants";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const COOKIE_NAME = "drms_token";

function pickFirstNonEmptyString(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value)) ?? null;
}

function pickFirstNonEmptyArray<T>(...values: Array<T[] | null | undefined>) {
  return values.find((value) => Array.isArray(value) && value.length > 0) ?? [];
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionUser) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET);
  const role = normalizeRole((payload as { role?: string }).role) ?? "team_member";
  return { ...(payload as unknown as SessionUser), role };
}

export async function getFreshSessionUser(sessionUser: SessionUser) {
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      workspaceMembers: {
        where: {
          workspaceId: sessionUser.workspaceId,
          status: "active",
          isActive: true
        },
        include: {
          departments: true
        }
      }
    }
  });

  if (!user || user.isDeleted) {
    return null;
  }

  const effectiveRole = normalizeRole(user.role || sessionUser.role) ?? "team_member";
  const isExecutive = effectiveRole === "admin" || effectiveRole === "ceo";

  // Prisma does not have teamName or departments on the User model natively if they were not in schema,
  // let's assume they might be in the future, or we get them from sessionUser. 
  // Wait, my Prisma schema doesn't have teamName on User! Let me check what we have.
  // Actually, wait, let me just map them.
  if (isExecutive) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      workspaceId: sessionUser.workspaceId || "",
      role: effectiveRole,
      teamName: sessionUser.teamName,
      teamNames: pickFirstNonEmptyArray(sessionUser.teamNames),
      departments: pickFirstNonEmptyArray(sessionUser.departments),
      status: "active"
    } satisfies SessionUser;
  }

  if (!sessionUser.workspaceId) {
    return null;
  }

  const member = user.workspaceMembers[0];

  if (!member) {
    return null;
  }

  // Fetch active team types for this workspace to dynamically filter out any corrupted/stale values
  const teamTypeWhere: Record<string, any> = { isActive: true, isDeleted: false };
  if (member.workspaceId) {
    teamTypeWhere.workspaceId = member.workspaceId;
  }
  const activeTeamTypes = await db.teamType.findMany({
    where: teamTypeWhere,
    select: { name: true }
  });
  const validTeamNames = activeTeamTypes.map((t) => t.name);

  const filteredTeamNames = (member.teamNames || []).filter((name) => validTeamNames.includes(name));
  const primaryTeamName = validTeamNames.includes(member.teamName) ? member.teamName : (filteredTeamNames[0] || null);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    workspaceId: member.workspaceId,
    role: normalizeRole(member.role) ?? "team_member",
    teamName: primaryTeamName,
    teamNames: filteredTeamNames,
    departments: member.departments?.map((d: any) => ({ name: d.name, subTeams: d.subTeams || [] })) || [] as any,
    status: member.status
  } satisfies SessionUser;
}

export async function setAuthCookie(user: SessionUser) {
  const token = await createToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0)
  });
}

export async function getSessionFromRequest(request: Request) {
  const cookieValue = request.headers.get("cookie") ?? "";
  const token = cookieValue
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const sessionUser = await verifyToken(token);
    return getFreshSessionUser(sessionUser);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const sessionUser = await verifyToken(token);
    return getFreshSessionUser(sessionUser);
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email: email.toLowerCase() } });
}
