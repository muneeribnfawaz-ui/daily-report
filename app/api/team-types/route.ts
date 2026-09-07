import { NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureDefaultTeamTypes } from "@/lib/bootstrap";
import { formatTeamTypeShowName } from "@/lib/team-types";

export async function GET() {
  await ensureDefaultTeamTypes();
    const teamTypes = await db.teamType.findMany({ where: { isActive: true, isDeleted: false }, orderBy: { name: 'asc' } });
  return NextResponse.json({
    success: true,
    data: teamTypes.map((teamType: any) => ({
      ...teamType,
      showName: formatTeamTypeShowName(teamType)
    }))
  });
}
