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
  return NextResponse.json({ success: false, message: "Team Types are finalized and cannot be created." }, { status: 405 });
}
