import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import TeamType from "@/models/TeamType";
import { ensureDefaultTeamTypes } from "@/lib/bootstrap";
import { formatTeamTypeShowName } from "@/lib/team-types";

export async function GET() {
  await ensureDefaultTeamTypes();
  await connectToDatabase();
  const teamTypes = await TeamType.find({ isActive: true, isDeleted: false }).sort({ name: 1 }).lean();
  return NextResponse.json({
    success: true,
    data: teamTypes.map((teamType) => ({
      ...teamType,
      showName: formatTeamTypeShowName(teamType)
    }))
  });
}
