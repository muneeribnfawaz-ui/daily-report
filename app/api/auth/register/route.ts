import { NextResponse } from "next/server";
import db from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { ensureDefaultAdmin } from "@/lib/bootstrap";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid registration payload" }, { status: 400 });
  }

  await ensureDefaultAdmin();
  const existing = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
  }

  const defaultWorkspace = await db.workspace.findFirst({ 
    where: { isDeleted: false }, 
    orderBy: { createdAt: 'asc' } 
  });

  const password = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      password,
      isDeleted: false
    }
  });

  if (defaultWorkspace) {
    await db.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: defaultWorkspace.id,
        role: "team_member",
        status: "active",
        isActive: true,
        departments: {
          create: [{ name: "Software", subTeams: [] }]
        }
      }
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "team_member",
      status: "active"
    }
  });
}
