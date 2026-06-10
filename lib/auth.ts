import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import type { SessionUser } from "@/lib/types";
import { normalizeRole } from "@/lib/constants";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const COOKIE_NAME = "drms_token";

type FreshSessionUserRecord = {
  _id: unknown;
  name: string;
  email: string;
  role?: string | null;
  teamName?: string | null;
  teamNames?: string[] | null;
  status?: string | null;
};

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

async function getFreshSessionUser(sessionUser: SessionUser) {
  await connectToDatabase();
  const user = await User.findById(sessionUser.id).lean<FreshSessionUserRecord | null>();

  if (!user || user.status !== "active") {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role) ?? "team_member",
    teamName: user.teamName,
    teamNames: user.teamNames ?? [],
    status: user.status
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
  await connectToDatabase();
  return User.findOne({ email: email.toLowerCase() }).lean();
}
