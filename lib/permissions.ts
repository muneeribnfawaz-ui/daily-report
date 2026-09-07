import type { SessionUser } from "@/lib/types";

export function canManageUsers(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo" || user?.role === "team_lead" || user?.role === "hod";
}

export function canManageReports(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canEditLockedReport(user: SessionUser | null) {
  if (user?.role === "ceo") return false;
  return user?.role === "admin" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canAccessAdminArea(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo";
}

export function canAccessReportManagerArea(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

/**
 * Returns a list of roles whose reports the given user is authorized to view.
 */
export function getVisibleReportRoles(user: SessionUser | null): string[] {
  if (!user) return [];
  switch (user.role) {
    case "admin":
    case "ceo":
      return ["hod", "report_manager", "team_lead", "team_member"];
    case "hod":
      return ["report_manager", "team_lead", "team_member"];
    case "report_manager":
      return []; // Only manages own reports unless otherwise specified
    case "team_lead":
      return ["team_member"];
    default:
      return []; // team_member cannot view others
  }
}

/**
 * Determines if a user can view another specific user's reports.
 */
export function canViewOtherUserReports(viewerRole: string, targetRole: string): boolean {
  if (viewerRole === "admin" || viewerRole === "ceo") return true;
  
  const hierarchy = ["team_member", "team_lead", "report_manager", "hod", "ceo", "admin"];
  const viewerIndex = hierarchy.indexOf(viewerRole);
  const targetIndex = hierarchy.indexOf(targetRole);
  
  if (viewerIndex === -1 || targetIndex === -1) return false;
  
  // Specific logic mapping to AGENTS.md requirements
  if (viewerRole === "hod") {
    return ["report_manager", "team_lead", "team_member"].includes(targetRole);
  }
  
  if (viewerRole === "team_lead") {
    return targetRole === "team_member";
  }

  return false;
}

export function isInMarketing(user: SessionUser | null): boolean {
  if (!user) return false;

  if (Array.isArray(user.departments)) {
    const hasDept = user.departments.some((d: any) => {
      if (typeof d === "string") return d.trim().toLowerCase() === "marketing";
      if (d && typeof d === "object" && typeof d.name === "string") {
        return d.name.trim().toLowerCase() === "marketing";
      }
      return false;
    });
    if (hasDept) return true;
  }

  if (typeof user.departments === "string" && (user.departments as string).trim().toLowerCase() === "marketing") {
    return true;
  }

  if (user.teamName && user.teamName.trim().toLowerCase().includes("marketing")) {
    return true;
  }

  if (Array.isArray(user.teamNames) && user.teamNames.some((t) => t && t.trim().toLowerCase().includes("marketing"))) {
    return true;
  }

  return false;
}

export function isInConstruction(user: SessionUser | null): boolean {
  if (!user) return false;

  if (Array.isArray(user.departments)) {
    const hasDept = user.departments.some((d: any) => {
      if (typeof d === "string") return d.trim().toLowerCase() === "construction";
      if (d && typeof d === "object" && typeof d.name === "string") {
        return d.name.trim().toLowerCase() === "construction";
      }
      return false;
    });
    if (hasDept) return true;
  }

  if (typeof user.departments === "string" && (user.departments as string).trim().toLowerCase() === "construction") {
    return true;
  }

  if (user.teamName && user.teamName.trim().toLowerCase().includes("construction")) {
    return true;
  }

  if (Array.isArray(user.teamNames) && user.teamNames.some((t) => t && t.trim().toLowerCase().includes("construction"))) {
    return true;
  }

  return false;
}

export function isInFinance(user: SessionUser | null): boolean {
  if (!user) return false;

  if (Array.isArray(user.departments)) {
    const hasDept = user.departments.some((d: any) => {
      if (typeof d === "string") return d.trim().toLowerCase() === "finance";
      if (d && typeof d === "object" && typeof d.name === "string") {
        return d.name.trim().toLowerCase() === "finance";
      }
      return false;
    });
    if (hasDept) return true;
  }

  if (typeof user.departments === "string" && (user.departments as string).trim().toLowerCase() === "finance") {
    return true;
  }

  if (user.teamName && user.teamName.trim().toLowerCase().includes("finance")) {
    return true;
  }

  if (Array.isArray(user.teamNames) && user.teamNames.some((t) => t && t.trim().toLowerCase().includes("finance"))) {
    return true;
  }

  return false;
}

export function canCreateMoneyRequest(user: SessionUser | null): boolean {
  if (!user) return false;
  const isFinanceTLorTM = user.role === "team_lead" || user.role === "team_member";
  return isFinanceTLorTM && isInFinance(user);
}

export function canCreateFinanceReport(user: SessionUser | null) {
  if (!user) return false;
  if (user.role === "hod" || user.role === "ceo") return false;
  return user.role === "admin" || isInFinance(user);
}

export function canEditFinanceReport(user: SessionUser | null) {
  if (!user) return false;
  if (user.role === "hod" || user.role === "ceo") return false;
  return user.role === "admin" || isInFinance(user);
}

export function canViewFinanceReport(user: SessionUser | null) {
  if (!user) return false;
  if (user.role === "hod" && !isInFinance(user)) return false;
  return user.role === "admin" || user.role === "ceo" || isInFinance(user);
}

export function canForwardFinanceReport(user: SessionUser | null) {
  if (!user) return false;
  if (user.role === "hod") return isInFinance(user);
  return user.role === "admin";
}

export function canApproveFinanceReport(user: SessionUser | null) {
  return user?.role === "ceo";
}

export function canSeeFinanceTab(user: SessionUser | null) {
  return canViewFinanceReport(user);
}

export function canAccessBanksAndPettyCash(user: SessionUser | null) {
  if (!user) return false;
  return user.role === "admin" || user.role === "ceo" || ((user.role === "team_lead" || user.role === "team_member") && isInFinance(user));
}

export function canUpdateEmail(editorRole: string, targetRole: string, isSelfUpdate: boolean): boolean {
  if (editorRole === "admin") return true;

  const roleHierarchy = ["admin", "ceo", "hod", "report_manager", "team_lead", "team_member"];
  const editorIndex = roleHierarchy.indexOf(editorRole);
  const targetIndex = roleHierarchy.indexOf(targetRole);

  if (editorIndex === -1 || targetIndex === -1) return false;

  const isTargetJunior = editorIndex < targetIndex;
  return !isSelfUpdate && isTargetJunior;
}
