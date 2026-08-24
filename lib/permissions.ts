import type { SessionUser } from "@/lib/types";
import { FINANCE_TEAM_INTERNAL_NAME } from "@/lib/constants";

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

function isInFinance(user: SessionUser | null): boolean {
  if (!user) return false;
  if (user.departments?.some((d) => d.name === "Finance")) return true;
  if (user.teamNames?.includes(FINANCE_TEAM_INTERNAL_NAME)) return true;
  if (user.teamName === FINANCE_TEAM_INTERNAL_NAME) return true;
  return false;
}

export function canCreateFinanceReport(user: SessionUser | null) {
  if (user?.role === "report_manager") return false;
  return user?.role === "ceo" || isInFinance(user);
}

export function canEditFinanceReport(user: SessionUser | null) {
  if (user?.role === "report_manager") return false;
  return user?.role === "ceo" || isInFinance(user);
}

export function canViewFinanceReport(user: SessionUser | null) {
  if (user?.role === "report_manager") return false;
  return user?.role === "ceo" || isInFinance(user);
}

export function canForwardFinanceReport(user: SessionUser | null) {
  return user?.role === "hod" && isInFinance(user);
}

export function canApproveFinanceReport(user: SessionUser | null) {
  return user?.role === "ceo";
}

export function canSeeFinanceTab(user: SessionUser | null) {
  return canViewFinanceReport(user);
}
