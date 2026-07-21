import appData from "@/config/app-data.json";

export const APP_NAME = "Daily Report Management System";

/** The internal team-type name for the Finance team (also in lib/team-types.ts for server use). */
export const FINANCE_TEAM_NAME = "FINANCE_TEAM";

export const TEAM_OPTIONS = appData.teamOptions as unknown as readonly [
  "Backend",
  "Blockchain",
  "Web",
  "Mobile",
  "QA",
  "Performance Interpreter",
  "Cloud",
  "AI",
  "Digital Marketing"
];

export const AUTH_ROLE_OPTIONS = appData.authRoleOptions as unknown as readonly ["admin", "ceo", "finance_team", "team_lead", "report_manager", "hod", "team_member"];
export type UserRole = (typeof AUTH_ROLE_OPTIONS)[number];
export const USER_ROLES = AUTH_ROLE_OPTIONS;

export const CREATE_USER_ROLE_OPTIONS = appData.createUserRoleOptions as unknown as readonly ["ceo", "finance_team", "team_lead", "report_manager", "hod", "team_member"];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  ceo: "CEO",
  finance_team: "Finance Team",
  team_lead: "Team Lead",
  report_manager: "Report Manager",
  hod: "HOD",
  team_member: "Team Member"
};

export const CREATE_USER_ROLE_LABELS: Record<(typeof CREATE_USER_ROLE_OPTIONS)[number], string> = {
  ceo: "CEO",
  finance_team: "Finance Team",
  team_lead: "Team Lead",
  report_manager: "Report Manager",
  hod: "HOD",
  team_member: "Team Member"
};

export const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  employee: "team_member"
};

export function normalizeRole(role?: string | null): UserRole | null {
  if (!role) return null;
  if (role === "admin" || role === "ceo" || role === "finance_team" || role === "team_lead" || role === "report_manager" || role === "hod" || role === "team_member") return role;
  return LEGACY_ROLE_ALIASES[role] ?? null;
}

export const DEFAULT_ADMIN_SEED = appData.defaultAdmin;
export const DEFAULT_TEAM_TYPE_SEEDS = TEAM_OPTIONS.map((teamName) => ({
  name: teamName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase(),
  showName: teamName,
  isActive: true,
  isDeleted: false,
  createdBy: "System"
}));

export type SidebarNavItem = {
  href: string;
  label: string;
};

const REPORT_MANAGER_SIDEBAR_ITEMS = [
  { href: "/report-manager/reports", label: "Reports" },
  { href: "/report-manager/consolidated-reports", label: "Consolidated" },
  { href: "/finance", label: "Finance" },
  { href: "/profile", label: "Profile" }
] as const satisfies ReadonlyArray<SidebarNavItem>;

const TEAM_LEAD_SIDEBAR_ITEMS = [
  { href: "/report-manager/dashboard", label: "Dashboard" },
  { href: "/daily-report/my-reports", label: "My Report" },
  { href: "/report-manager/users", label: "My Team" },
  { href: "/report-manager/reports", label: "All Reports" },
  { href: "/report-manager/consolidated-reports", label: "Consolidated" },
  { href: "/finance", label: "Finance" },
  { href: "/leave-requests", label: "Leave Requests" },
  { href: "/profile", label: "Profile" }
] as const satisfies ReadonlyArray<SidebarNavItem>;

const HOD_SIDEBAR_ITEMS = [
  { href: "/report-manager/dashboard", label: "Dashboard" },
  { href: "/report-manager/users", label: "Users" },
  { href: "/report-manager/reports", label: "Reports" },
  { href: "/report-manager/consolidated-reports", label: "Consolidated" },
  { href: "/finance", label: "Finance" },
  { href: "/leave-requests", label: "Leave Requests" },
  { href: "/profile", label: "Profile" }
] as const satisfies ReadonlyArray<SidebarNavItem>;

const TEAM_MEMBER_SIDEBAR_ITEMS = [
  { href: "/daily-report/my-reports", label: "My Report" },
  { href: "/leave-requests", label: "Leave Requests" },
  { href: "/profile", label: "Profile" }
] as const satisfies ReadonlyArray<SidebarNavItem>;

const FINANCE_TEAM_SIDEBAR_ITEMS = [
  { href: "/finance", label: "Finance" },
  { href: "/daily-report/my-reports", label: "My Report" },
  { href: "/leave-requests", label: "Leave Requests" },
  { href: "/profile", label: "Profile" }
] as const satisfies ReadonlyArray<SidebarNavItem>;

const ADMIN_SIDEBAR_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/team-types", label: "Team Types" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/consolidated-reports", label: "Consolidated" },
  { href: "/finance", label: "Finance" },
  { href: "/leave-requests", label: "Leave Requests" },
  { href: "/profile", label: "Profile" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-logs", label: "Audit Logs" }
] as const satisfies ReadonlyArray<SidebarNavItem>;

export const SIDEBAR_NAV_ITEMS_BY_ROLE = {
  team_member: TEAM_MEMBER_SIDEBAR_ITEMS,
  team_lead: TEAM_LEAD_SIDEBAR_ITEMS,
  report_manager: REPORT_MANAGER_SIDEBAR_ITEMS,
  hod: HOD_SIDEBAR_ITEMS,
  finance_team: FINANCE_TEAM_SIDEBAR_ITEMS,
  admin: ADMIN_SIDEBAR_ITEMS,
  ceo: ADMIN_SIDEBAR_ITEMS
} as const;

export const SOFTWARE_ROLE_OPTIONS = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Mobile Engineer",
  "Cloud Engineer",
  "Web Developer",
  "QA Engineer",
  "DevOps Engineer",
  "Data Engineer",
  "Security Engineer",
  "Product Manager",
  "UI/UX Designer",
  "Technical Lead",
  "Scrum Master",
  "Business Analyst",
  "Support Engineer"
] as const;

export const SOFTWARE_ROLE_DESCRIPTIONS: Record<(typeof SOFTWARE_ROLE_OPTIONS)[number], string> = {
  "Frontend Engineer": "Builds interactive interfaces and client-side features.",
  "Backend Engineer": "Designs APIs, services, and data integrations.",
  "Full Stack Engineer": "Works across both client and server layers.",
  "Mobile Engineer": "Builds iOS and Android app experiences.",
  "Cloud Engineer": "Owns cloud infrastructure, deployment, and reliability.",
  "Web Developer": "Creates and maintains website experiences.",
  "QA Engineer": "Validates functionality and prevents regressions.",
  "DevOps Engineer": "Improves automation, delivery, and release flow.",
  "Data Engineer": "Builds pipelines and manages data movement.",
  "Security Engineer": "Strengthens application and platform security.",
  "Product Manager": "Shapes priorities, roadmap, and business outcomes.",
  "UI/UX Designer": "Designs interfaces, flows, and visual clarity.",
  "Technical Lead": "Guides implementation and engineering decisions.",
  "Scrum Master": "Keeps delivery flowing and removes team blockers.",
  "Business Analyst": "Turns requirements into clear product scope.",
  "Support Engineer": "Resolves issues and supports day-to-day operations."
};

export const LEAVE_TYPE_OPTIONS = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Work From Home",
  "Other"
] as const;

export const LEAVE_DURATION_OPTIONS = ["full_day", "half_day"] as const;

export const LEAVE_DURATION_LABELS: Record<(typeof LEAVE_DURATION_OPTIONS)[number], string> = {
  full_day: "Full Day",
  half_day: "Half Day"
};

export const LEAVE_HALF_OPTIONS = ["first_half", "second_half"] as const;

export const LEAVE_HALF_LABELS: Record<(typeof LEAVE_HALF_OPTIONS)[number], string> = {
  first_half: "First Half",
  second_half: "Second Half"
};

export const REPORT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "locked"
] as const;

export const CONSOLIDATED_REPORT_STATUSES = [
  "draft",
  "finalized",
  "archived"
] as const;

export const FINANCE_REPORT_STATUSES = [
  "pending",
  "forwarded_to_ceo",
  "approved",
  "rejected"
] as const;

export const FINANCE_REPORT_FIELDS = [
  { key: "openingBalance", label: "Opening Balance", group: "income" },
  { key: "cashReceived", label: "Cash Received", group: "income" },
  { key: "cardSales", label: "Card Sales", group: "income" },
  { key: "onlinePayments", label: "Online Payments", group: "income" },
  { key: "expenses", label: "Expenses", group: "expense" },
  { key: "refunds", label: "Refunds", group: "expense" },
  { key: "pettyCash", label: "Petty Cash", group: "expense" },
  { key: "bankDeposit", label: "Bank Deposit", group: "neutral" },
  { key: "closingCashBalance", label: "Closing Cash Balance", group: "neutral" }
] as const;
