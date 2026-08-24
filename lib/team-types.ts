import { connectToDatabase } from "@/lib/db";
import TeamType from "@/models/TeamType";

import { FINANCE_TEAM_INTERNAL_NAME } from "@/lib/constants";
import { formatDisplayName } from "@/lib/utils";

export function formatTeamTypeShowName(teamType: any) {
  const existingShowName = teamType.showName?.trim();
  if (existingShowName) return formatDisplayName(existingShowName);

  const internalName = teamType.name?.trim();
  if (!internalName) return "";

  return formatDisplayName(internalName);
}

export async function getActiveTeamTypeNames() {
  await connectToDatabase();
  const teamTypes = await TeamType.find({ isActive: true, isDeleted: false }).lean();
  return teamTypes.map((teamType) => teamType.name);
}

export async function getActiveTeamTypeShowNameMap() {
  await connectToDatabase();
  const teamTypes = await TeamType.find({ isActive: true, isDeleted: false }).lean();

  return Object.fromEntries(
    teamTypes
      .filter((teamType) => Boolean(teamType.name?.trim()))
      .map((teamType) => [teamType.name, formatTeamTypeShowName(teamType)])
  ) as Record<string, string>;
}

export async function isValidTeamTypeName(teamName: string) {
  const teamNames = await getActiveTeamTypeNames();
  return teamNames.includes(teamName);
}

/**
 * Returns the list of internal team-type names that belong to the Finance group.
 * Currently this is always [FINANCE_TEAM_INTERNAL_NAME], but the array shape
 * keeps the door open for future multi-team Finance groups.
 */
export async function getFinanceTeamInternalNames(): Promise<string[]> {
  await connectToDatabase();
  const teamTypes = await TeamType.find({ name: FINANCE_TEAM_INTERNAL_NAME, isDeleted: false }).lean();
  return teamTypes.map((t) => t.name as string);
}

export async function getTeamNamesByDepartment(department: string): Promise<string[]> {
  await connectToDatabase();
  const teamTypes = await TeamType.find({ department, isDeleted: false }).lean();
  return teamTypes.map((t) => t.name as string);
}
