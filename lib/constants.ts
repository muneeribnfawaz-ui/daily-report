import appData from "@/config/app-data.json";

export const FINANCE_TEAM_INTERNAL_NAME = "FINANCE_TEAM";

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

export const CREATE_USER_ROLE_OPTIONS = appData.createUserRoleOptions as unknown as readonly ["ceo", "team_lead", "report_manager", "hod", "team_member"];

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

export const DEPARTMENT_OPTIONS = ["Construction", "Software", "Finance", "Marketing"] as const;
export type DepartmentName = (typeof DEPARTMENT_OPTIONS)[number];

export const MARKETING_SUB_TEAMS = ["Physical", "Digital"] as const;
export type MarketingSubTeam = (typeof MARKETING_SUB_TEAMS)[number];

export const DEFAULT_ADMIN_SEED = appData.defaultAdmin;

export const DEFAULT_TEAM_TYPE_SEEDS = [
  { name: "FINANCE_TEAM", showName: "Finance Team", department: "Finance", subTeams: [], isActive: true, isDeleted: false, createdBy: "System" }
];

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

// All skills across all departments — used for schema validation
export const ALL_SKILL_OPTIONS = [
  // Software
  "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Mobile Engineer",
  "Cloud Engineer", "Web Developer", "QA Engineer", "DevOps Engineer", "Data Engineer",
  "Security Engineer", "Product Manager", "UI/UX Designer", "Technical Lead",
  "Scrum Master", "Business Analyst", "Support Engineer",
  // Construction
  "Civil Engineer", "Structural Engineer", "Site Supervisor", "Project Manager",
  "Safety Officer", "Quantity Surveyor", "MEP Engineer", "Foreman", "Estimator", "Architect",
  // Finance
  "Financial Analyst", "Accountant", "Auditor", "Payroll Specialist", "Tax Consultant",
  "Billing Manager", "Cashier / Petty Cash Custodian", "Treasury Analyst",
  // Marketing
  "Content Strategist", "SEO Specialist", "Social Media Manager", "Growth Marketer",
  "Brand Specialist", "Campaign Manager", "Performance Marketer", "Copywriter", "Field Marketer"
] as const;
export type AnySkillOption = (typeof ALL_SKILL_OPTIONS)[number];

export type SkillOption = {
  name: string;
  description: string;
  department: "Construction" | "Software" | "Finance" | "Marketing";
};

export const DEPARTMENT_SKILLS: Record<string, SkillOption[]> = {
  Software: [
    { name: "Frontend Engineer", description: "Builds interactive interfaces and client-side features.", department: "Software" },
    { name: "Backend Engineer", description: "Designs APIs, services, and data integrations.", department: "Software" },
    { name: "Full Stack Engineer", description: "Works across both client and server layers.", department: "Software" },
    { name: "Mobile Engineer", description: "Builds iOS and Android app experiences.", department: "Software" },
    { name: "Cloud Engineer", description: "Owns cloud infrastructure, deployment, and reliability.", department: "Software" },
    { name: "Web Developer", description: "Creates and maintains website experiences.", department: "Software" },
    { name: "QA Engineer", description: "Validates functionality and prevents regressions.", department: "Software" },
    { name: "DevOps Engineer", description: "Improves automation, delivery, and release flow.", department: "Software" },
    { name: "Data Engineer", description: "Builds pipelines and manages data movement.", department: "Software" },
    { name: "Security Engineer", description: "Strengthens application and platform security.", department: "Software" },
    { name: "Product Manager", description: "Shapes priorities, roadmap, and business outcomes.", department: "Software" },
    { name: "UI/UX Designer", description: "Designs interfaces, flows, and visual clarity.", department: "Software" },
    { name: "Technical Lead", description: "Guides implementation and engineering decisions.", department: "Software" },
    { name: "Scrum Master", description: "Keeps delivery flowing and removes team blockers.", department: "Software" },
    { name: "Business Analyst", description: "Turns requirements into clear product scope.", department: "Software" },
    { name: "Support Engineer", description: "Resolves issues and supports day-to-day operations.", department: "Software" }
  ],
  Construction: [
    { name: "Civil Engineer", description: "Oversees site planning, civil works, and design compliance.", department: "Construction" },
    { name: "Structural Engineer", description: "Ensures safety and structural integrity.", department: "Construction" },
    { name: "Site Supervisor", description: "Manages day-to-day site operations and labor crews.", department: "Construction" },
    { name: "Project Manager", description: "Controls project timelines, budgets, and site deliverables.", department: "Construction" },
    { name: "Safety Officer", description: "Enforces HSE standards and risk prevention protocols.", department: "Construction" },
    { name: "Quantity Surveyor", description: "Manages material costs, estimations, and quantities.", department: "Construction" },
    { name: "MEP Engineer", description: "Oversees Mechanical, Electrical, and Plumbing execution.", department: "Construction" },
    { name: "Foreman", description: "Directs trade crews and daily work execution.", department: "Construction" },
    { name: "Estimator", description: "Calculates material, labor, and equipment cost estimates.", department: "Construction" },
    { name: "Architect", description: "Ensures architectural alignment and blueprint compliance.", department: "Construction" }
  ],
  Finance: [
    { name: "Financial Analyst", description: "Analyzes financial performance, trends, and projections.", department: "Finance" },
    { name: "Accountant", description: "Maintains financial ledgers, entries, and reconciliations.", department: "Finance" },
    { name: "Auditor", description: "Verifies financial accuracy and internal compliance controls.", department: "Finance" },
    { name: "Payroll Specialist", description: "Manages salary processing, compensation, and taxes.", department: "Finance" },
    { name: "Tax Consultant", description: "Handles tax planning, filing, and regulatory compliance.", department: "Finance" },
    { name: "Billing Manager", description: "Oversees invoicing, accounts receivable, and collections.", department: "Finance" },
    { name: "Cashier / Petty Cash Custodian", description: "Manages daily cash handling and balance reports.", department: "Finance" },
    { name: "Treasury Analyst", description: "Manages cash flow liquidity and banking relationships.", department: "Finance" }
  ],
  Marketing: [
    { name: "Content Strategist", description: "Plans and produces content marketing initiatives.", department: "Marketing" },
    { name: "SEO Specialist", description: "Optimizes search visibility and organic web acquisition.", department: "Marketing" },
    { name: "Social Media Manager", description: "Drives engagement across social media channels.", department: "Marketing" },
    { name: "Growth Marketer", description: "Focuses on user acquisition, funnels, and retention.", department: "Marketing" },
    { name: "Brand Specialist", description: "Maintains brand identity, messaging, and positioning.", department: "Marketing" },
    { name: "Campaign Manager", description: "Coordinates end-to-end promotional campaigns.", department: "Marketing" },
    { name: "Performance Marketer", description: "Manages paid ads, PPC, and performance analytics.", department: "Marketing" },
    { name: "Copywriter", description: "Crafts compelling marketing copy and messaging.", department: "Marketing" },
    { name: "Field Marketer", description: "Executes physical marketing events and local campaigns.", department: "Marketing" }
  ]
};

export function getSkillsForDepartments(departmentNames?: string[]): SkillOption[] {
  if (!departmentNames || departmentNames.length === 0) {
    return [];
  }
  const skills: SkillOption[] = [];
  const added = new Set<string>();
  for (const dept of departmentNames) {
    const deptSkills = DEPARTMENT_SKILLS[dept] || [];
    for (const skill of deptSkills) {
      if (!added.has(skill.name)) {
        added.add(skill.name);
        skills.push(skill);
      }
    }
  }
  return skills;
}

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
