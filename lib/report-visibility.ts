import User from "@/models/User";

type VisibleUser = {
  _id?: unknown;
  name?: string | null;
  managerName?: string | null;
  teamName?: string | null;
  teamNames?: string[] | null;
  role?: string | null;
};

function collectDescendantUserNames(users: Array<{ name?: string | null; managerName?: string | null }>, rootManagerName: string) {
  const descendantNames = new Set<string>();
  const queue = [rootManagerName];

  while (queue.length) {
    const currentManager = queue.shift();
    if (!currentManager) continue;

    for (const user of users) {
      if (!user.name || !user.managerName) continue;
      if (user.managerName !== currentManager || descendantNames.has(user.name)) continue;

      descendantNames.add(user.name);
      queue.push(user.name);
    }
  }

  return descendantNames;
}

export async function getVisibleReportEmployeeIds(user: {
  id: string;
  name: string;
  role: string;
  teamName?: string | null;
}) {
  if (user.role === "admin" || user.role === "hod" || user.role === "report_manager") {
    return null;
  }

  const allUsers = (await User.find({}).lean()) as VisibleUser[];
  const visibleUserNames = collectDescendantUserNames(
    allUsers as Array<{ name?: string | null; managerName?: string | null }>,
    user.name
  );

  if (user.name) {
    visibleUserNames.add(user.name);
  }

  const visibleEmployeeIds = new Set<string>();
  for (const currentUser of allUsers) {
    if (!currentUser._id || !currentUser.name) continue;

    const isDescendant = visibleUserNames.has(currentUser.name);
    const isSameTeam =
      Boolean(user.teamName) &&
      (currentUser.teamName === user.teamName || currentUser.teamNames?.includes(user.teamName ?? ""));

    if (isDescendant || isSameTeam) {
      visibleEmployeeIds.add(String(currentUser._id));
    }
  }

  return Array.from(visibleEmployeeIds);
}
