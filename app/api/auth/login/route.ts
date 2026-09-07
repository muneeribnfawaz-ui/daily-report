import { NextResponse } from "next/server";
import db from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword, setAuthCookie } from "@/lib/auth";
import { ensureDefaultAdmin } from "@/lib/bootstrap";
import { normalizeRole } from "@/lib/constants";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return ApiResponse.validationError("Invalid login payload", parsed.error.format());
  }

  await ensureDefaultAdmin();
  const user = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase() } });

  if (!user) {
    return ApiResponse.loginError("Invalid credentials");
  }

  if (user.isDeleted) {
    return ApiResponse.forbidden("Your account is not active");
  }

  const matches = await verifyPassword(parsed.data.password, user.password);
  if (!matches) {
    return ApiResponse.loginError("Invalid credentials");
  }

  const isExecutive = user.role === "admin" || user.role === "ceo";
  const firstMember = await db.workspaceMember.findFirst({ 
    where: { userId: user.id, status: "active", isActive: true },
    include: { departments: true }
  });

  if (!firstMember && !isExecutive) {
    return ApiResponse.forbidden("You are not assigned to any active workspace.");
  }

  const role = normalizeRole(isExecutive ? user.role : firstMember?.role) ?? "team_member";
  const workspaceId = firstMember ? String(firstMember.workspaceId) : "";
  
  await setAuthCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    workspaceId,
    role,
    teamName: firstMember?.teamName || null,
    teamNames: firstMember?.teamNames || [],
    departments: firstMember?.departments || [],
    status: firstMember?.status || (user.isDeleted ? "inactive" : "active")
  });

  return ApiResponse.loginSuccess({
    id: user.id,
    name: user.name,
    email: user.email,
    workspaceId,
    role,
    teamName: firstMember?.teamName || null,
    teamNames: firstMember?.teamNames || [],
    departments: firstMember?.departments || [],
    status: firstMember?.status || (user.isDeleted ? "inactive" : "active")
  });
}
