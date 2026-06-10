import { connectToDatabase } from "@/lib/db";
import TeamType from "@/models/TeamType";

export function formatTeamTypeShowName(teamType: any) {
  const existingShowName = teamType.showName?.trim();
  if (existingShowName) return existingShowName;

  const internalName = teamType.name?.trim();
  if (!internalName) return "";

  return internalName
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
