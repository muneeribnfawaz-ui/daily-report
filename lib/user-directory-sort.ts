export type DirectoryUserLike = {
  role?: string | null;
  name?: string | null;
  teamName?: string | null;
  teamNames?: string[] | null;
};

export type TeamTypeShowNameMap = Record<string, string>;

function getPrimaryTeam(user: DirectoryUserLike) {
  return (
    user.teamNames?.find((teamName) => Boolean(teamName?.trim())) ??
    user.teamName ??
    ""
  ).trim();
}

function getRoleRank(role?: string | null) {
  if (role === "hod") return 0;
  if (role === "team_lead") return 1;
  if (role === "team_member") return 2;
  if (role === "report_manager") return 3;
  if (role === "admin" || role === "ceo") return 4;
  return 4;
}

export function sortUsersForDirectory<T>(users: T[]) {
  return users.slice().sort((a, b) => {
    const left = a as DirectoryUserLike;
    const right = b as DirectoryUserLike;
    const roleDiff = getRoleRank(left.role) - getRoleRank(right.role);
    if (roleDiff !== 0) return roleDiff;

    const teamDiff = getPrimaryTeam(left).localeCompare(getPrimaryTeam(right));
    if (teamDiff !== 0) return teamDiff;

    return (left.name ?? "").localeCompare(right.name ?? "");
  });
}

export function getUserTeamLabel(user: unknown, teamTypeShowNameMap: TeamTypeShowNameMap = {}) {
  const currentUser = user as DirectoryUserLike;
  const resolvedTeamNames =
    currentUser.teamNames?.length
      ? currentUser.teamNames
      : currentUser.teamName
        ? [currentUser.teamName]
        : [];

  if (resolvedTeamNames.length) {
    return resolvedTeamNames
      .map((teamName) => teamTypeShowNameMap[teamName] ?? teamName)
      .join(", ");
  }
  return "";
}
