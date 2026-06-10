import type { SessionUser } from "@/lib/types";

export function canManageUsers(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canManageReports(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canEditLockedReport(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}

export function canAccessAdminArea(user: SessionUser | null) {
  return user?.role === "admin";
}

export function canAccessReportManagerArea(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "team_lead" || user?.role === "report_manager" || user?.role === "hod";
}
