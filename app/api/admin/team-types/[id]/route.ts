import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import TeamType from "@/models/TeamType";
import { z } from "zod";
import { formatTeamTypeShowName } from "@/lib/team-types";

const teamTypeUpdateSchema = z.object({
  showName: z.string().min(2).optional(),
  department: z.enum(["Construction", "Software", "Finance", "Marketing"]).optional().nullable(),
  subTeams: z.array(z.enum(["Physical", "Digital"])).optional(),
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional()
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const teamType = await TeamType.findById(id).lean();
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
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const parsed = teamTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid payload", errors: parsed.error.format() }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await TeamType.findById(id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Team type not found" }, { status: 404 });
  }

  if (parsed.data.showName !== undefined) existing.showName = parsed.data.showName;
  if (parsed.data.department !== undefined) existing.department = parsed.data.department ?? undefined;
  if (parsed.data.subTeams !== undefined) {
    existing.subTeams = existing.department === "Marketing" || parsed.data.department === "Marketing" ? parsed.data.subTeams : [];
  }
  if (parsed.data.isActive !== undefined) existing.isActive = parsed.data.isActive;
  if (parsed.data.isDeleted !== undefined) existing.isDeleted = parsed.data.isDeleted;

  await existing.save();

  return NextResponse.json({
    success: true,
    data: {
      ...existing.toObject(),
      showName: formatTeamTypeShowName(existing)
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const existing = await TeamType.findById(id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Team type not found" }, { status: 404 });
  }

  existing.isDeleted = true;
  existing.isActive = false;
  await existing.save();

  return NextResponse.json({ success: true, message: "Team type deleted successfully" });
}

