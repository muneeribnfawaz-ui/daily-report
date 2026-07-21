import type { SessionUser } from "@/lib/types";

export function canManageUsers(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canManageReports(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canEditLockedReport(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canAccessAdminArea(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo";
}

export function canAccessReportManagerArea(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "ceo" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

// ── Finance Report Permissions ──────────────────────────────────────────

export function canCreateFinanceReport(user: SessionUser | null) {
  return user?.role === "finance_team" || user?.role === "ceo";
}

export function canEditFinanceReport(user: SessionUser | null) {
  return user?.role === "finance_team" || user?.role === "ceo";
}

export function canViewFinanceReport(user: SessionUser | null) {
  return (
    user?.role === "finance_team" ||
    user?.role === "ceo" ||
    (user?.role === "hod" && user?.teamNames?.includes("FINANCE")) ||
    (user?.role === "hod" && user?.teamName === "FINANCE")
  );
}

export function canForwardFinanceReport(user: SessionUser | null) {
  return (user?.role === "hod" && (user?.teamNames?.includes("FINANCE") || user?.teamName === "FINANCE"));
}

export function canApproveFinanceReport(user: SessionUser | null) {
  return user?.role === "ceo";
}

export function canSeeFinanceTab(user: SessionUser | null) {
  return canViewFinanceReport(user);
}
