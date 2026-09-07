import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { formatTeamTypeShowName } from "@/lib/team-types";
import { authorizeApi } from "@/lib/api-auth";

const teamTypeUpdateSchema = z.object({
  showName: z.string().min(2).optional(),
  department: z.enum(["Construction", "Software", "Finance", "Marketing"]).optional().nullable(),
  subTeams: z.array(z.enum(["Physical", "Digital"])).optional(),
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional()
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
    const teamType = await db.teamType.findUnique({ where: { id: String(id) } });
  if (!teamType) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...teamType,
      showName: formatTeamTypeShowName(teamType)
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const parsed = teamTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid payload", errors: parsed.error.format() }, { status: 400 });
  }

    const existing = await db.teamType.findUnique({ where: { id: String(id) } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Team type not found" }, { status: 404 });
  }

  const dataToUpdate: any = {};
  if (parsed.data.showName !== undefined) dataToUpdate.showName = parsed.data.showName;
  if (parsed.data.department !== undefined) dataToUpdate.department = parsed.data.department ?? "";
  if (parsed.data.subTeams !== undefined) {
    dataToUpdate.subTeams = (dataToUpdate.department ?? existing.department) === "Marketing" ? parsed.data.subTeams : [];
  }
  if (parsed.data.isActive !== undefined) dataToUpdate.isActive = parsed.data.isActive;
  if (parsed.data.isDeleted !== undefined) dataToUpdate.isDeleted = parsed.data.isDeleted;

  const updated = await db.teamType.update({
    where: { id: existing.id },
    data: dataToUpdate
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      showName: formatTeamTypeShowName(updated)
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
    const existing = await db.teamType.findUnique({ where: { id: String(id) } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Team type not found" }, { status: 404 });
  }

  await db.teamType.update({
    where: { id: existing.id },
    data: { isDeleted: true, isActive: false }
  });

  return NextResponse.json({ success: true, message: "Team type deleted successfully" });
}

