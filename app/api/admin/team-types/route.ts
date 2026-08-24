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
  department: z.enum(["Construction", "Software", "Finance", "Marketing"]).optional(),
  subTeams: z.array(z.enum(["Physical", "Digital"])).optional().default([]),
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
    return NextResponse.json({ success: false, message: "Invalid payload", errors: parsed.error.format() }, { status: 400 });
  }

  const internalName = toInternalTeamTypeName(parsed.data.showName);
  if (!internalName) {
    return NextResponse.json({ success: false, message: "Invalid team type name" }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await TeamType.findOne({ name: internalName });
  if (existing) {
    return NextResponse.json({ success: false, message: "A team type with this name already exists" }, { status: 409 });
  }

  const newTeamType = await TeamType.create({
    name: internalName,
    showName: parsed.data.showName,
    department: parsed.data.department,
    subTeams: parsed.data.department === "Marketing" ? parsed.data.subTeams : [],
    isActive: parsed.data.isActive,
    isDeleted: parsed.data.isDeleted,
    createdBy: user.name || "System"
  });

  return NextResponse.json({
    success: true,
    data: {
      ...newTeamType.toObject(),
      showName: formatTeamTypeShowName(newTeamType)
    }
  }, { status: 201 });
}

