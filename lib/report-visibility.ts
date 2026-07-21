import User from "@/models/User";

type VisibleUser = {
  _id?: unknown;
  name?: string | null;
  managerName?: string | null;
  teamName?: string | null;
  teamNames?: string[] | null;
  departments?: { name: string; subTeams?: string[] }[];
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
  if (user.role === "admin" || user.role === "ceo" || user.role === "hod") {
    return null; // Can see everyone
  }

  const allUsers = (await User.find({}).lean()) as VisibleUser[];
  const visibleEmployeeIds = new Set<string>();

  if (user.role === "report_manager") {
    // Report Manager can only see Software and Marketing (Digital)
    for (const currentUser of allUsers) {
      if (!currentUser._id) continue;
      const isAllowed = currentUser.departments?.some(
        (dept) =>
          dept.name === "Software" ||
          (dept.name === "Marketing" && dept.subTeams?.includes("Digital"))
      );
      if (isAllowed) {
        visibleEmployeeIds.add(String(currentUser._id));
      }
    }
    return Array.from(visibleEmployeeIds);
  }

  const visibleUserNames = collectDescendantUserNames(
    allUsers as Array<{ name?: string | null; managerName?: string | null }>,
    user.name
  );

  if (user.name) {
    visibleUserNames.add(user.name);
  }

  for (const currentUser of allUsers) {
    if (!currentUser._id || !currentUser.name) continue;

    const isDescendant = visibleUserNames.has(currentUser.name);
    const isSameTeam =
      Boolean(user.teamName) &&
      (currentUser.teamName === user.teamName || currentUser.teamNames?.includes(user.teamName ?? ""));
      
    // Additionally, check new departments structure for Team Leads if needed
    // Assuming backward compatibility with teamName for now in standard logic

    if (isDescendant || isSameTeam) {
      visibleEmployeeIds.add(String(currentUser._id));
    }
  }

  return Array.from(visibleEmployeeIds);
}

