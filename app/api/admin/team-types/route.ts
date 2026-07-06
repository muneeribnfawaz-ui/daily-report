import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import TeamType from "@/models/TeamType";
import { z } from "zod";
import { ensureDefaultTeamTypes } from "@/lib/bootstrap";
import { formatTeamTypeShowName } from "@/lib/team-types";

function toInternalTeamTypeName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

const teamTypeSchema = z.object({
  showName: z.string().min(2),
  isActive: z.boolean().optional().default(true),
  isDeleted: z.boolean().optional().default(false)
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await ensureDefaultTeamTypes();
  await connectToDatabase();
  const teamTypes = await TeamType.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    success: true,
    data: teamTypes.map((teamType) => ({
      ...teamType,
      showName: formatTeamTypeShowName(teamType)
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = teamTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid team type payload" }, { status: 400 });
  }

  await connectToDatabase();
  const generatedName = toInternalTeamTypeName(parsed.data.showName);
  const existingByGeneratedName = await TeamType.findOne({ name: generatedName }).lean();
  if (existingByGeneratedName) {
    return NextResponse.json({ success: false, message: "Team type already exists" }, { status: 409 });
  }

  const teamType = await TeamType.create({
    name: generatedName,
    showName: parsed.data.showName.trim(),
    isActive: parsed.data.isActive,
    isDeleted: parsed.data.isDeleted,
    createdBy: user.name
  });

  return NextResponse.json({ success: true, data: teamType }, { status: 201 });
}
