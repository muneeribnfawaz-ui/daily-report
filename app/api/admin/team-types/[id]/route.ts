import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import TeamType from "@/models/TeamType";
import { z } from "zod";
import { formatTeamTypeShowName } from "@/lib/team-types";

const teamTypeUpdateSchema = z.object({
  showName: z.string().min(2).optional(),
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
  return NextResponse.json({ success: false, message: "Team Types are finalized and cannot be modified." }, { status: 405 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ success: false, message: "Team Types are finalized and cannot be deleted." }, { status: 405 });
}
