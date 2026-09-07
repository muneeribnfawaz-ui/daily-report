# Agent Rules & Guidelines

This document outlines the coding standards, architectural patterns, role permissions, and development workflow rules for the **Daily Report Management System**.

---

## 1. Role & Permission Architecture

- **Executive & Administrative Roles (`admin`, `ceo`)**:
  - Full access to administrative command center (`/admin/*`).
  - Access to Companies Management (`/admin/companies`), Users (`/admin/users`), Team Types (`/admin/team-types`), Reports (`/admin/reports`), Consolidated Reports (`/consolidated-reports`), Finance (`/finance`), Leave Requests (`/leave-requests`), Settings (`/admin/settings`), and Audit Logs (`/admin/audit-logs`).
  - Admin and CEO sidebar configurations are separate: the CEO's sidebar contains Dashboard, Employees, Team Types, Reports, Consolidated, and Finance (it does NOT contain Companies, Leave Requests, Profile, Settings, or Audit Logs). The Admin's sidebar also does not contain the CEO option.
  - Executive roles (`admin` and `ceo`) exist at the system level and bypass mandatory `workspaceId` checks during user creation and authentication.
  - **CEO Workspace Scoping**: Unlike globally unbound Administrators (`admin`), the CEO role is bound to workspaces via active `WorkspaceMember` memberships. CEOs can only see, access, and manage database records (users, reports, audit logs, dashboard stats) belonging to workspaces where they hold active memberships.
  - **Only Administrators (`admin`) can create or assign a CEO (`ceo`) account.** CEOs cannot create other CEO accounts.
  - **CEO Directory Page (`/admin/users?role=ceo`) & Profile Visibility**:
    - The directory view for CEO accounts displays name and team details with only the "Edit" button shown. The "Report" and "View" buttons are hidden.
    - Clicking on a CEO's info row/list item directly navigates to their detailed view page (`/admin/users/[id]`).
    - **CEO Profile Access**: CEO details (`/admin/users/[id]` and `/api/users/[id]`) can ONLY be accessed, viewed, or edited by Administrators (`admin`) and that specific CEO user themselves (`user.id === targetUser.id`). Other roles attempting to access a CEO profile must be denied access (`403 Forbidden`).
    - The "Team Types" action button is hidden from this view.
  - **CEO Report Scope & View-Only Restriction**:
    - **Daily Reports (`/reports` / `/ceo/reports`)**: The CEO role can view **all** daily reports across their assigned company workspace(s).
    - **Consolidated Reports (`/consolidated-reports`)**: Consolidated reports for the CEO role are generated and displayed **strictly from Head of Department (`role === 'hod'`) reports only**.
    - **CEO Report View-Only Rule**: CEO accounts (`role === 'ceo'`) can **ONLY view reports**, and cannot create or update/edit report content. Functions `canCreateFinanceReport`, `canEditFinanceReport`, `canEditLockedReport`, and `canEditDailyReport` strictly evaluate to `false` for the CEO role. CEO can review and approve/reject money requests or executive approval items, but cannot edit underlying report contents.

- **Report Viewing Hierarchy**:
  - The system enforces strict hierarchical access control for viewing reports:
    - **Team Leads (TL)**: Can view reports submitted by Team Members (TM).
    - **Head of Department (HOD)**: Can view reports submitted by Report Managers, Team Leads, and Team Members within their assigned departments.
    - **CEO & Admin**: Can view reports submitted by HODs, Report Managers, Team Leads, and Team Members across the company workspaces they have access to.

- **Role-Based API Authorization Guard**:
  - All API endpoints (except public auth routes `/api/auth/login` and `/api/auth/register`) MUST enforce strict role-based authorization using `authorizeApi(request, allowedRoles)`.
  - Unauthenticated requests trigger `ApiResponse.unauthorized()` (`statusCode: 4003`, `httpStatus: 401`).
  - Unauthorized role requests trigger `ApiResponse.forbidden()` (`statusCode: 4003`, `httpStatus: 403`).

- **Finance & Operational Roles**:
  - Access controlled dynamically via `canViewFinanceReport`, `canForwardFinanceReport`, `canApproveFinanceReport`, and `canCreateMoneyRequest` in `lib/permissions.ts`.
  - **Money Requests (`/finance/requests`)**: Money request creation is exclusively permitted for Finance Team Leads (`team_lead`) and Finance Team Members (`team_member`). Clicking "Create Request" displays only the Next Day Money Request (Approval Required) form, which routes to `/finance/requests/create` and attaches request items to the finance report. Money requests are managed exclusively in `/finance/requests` and are not embedded or duplicated in standard Finance Reports (`/finance`). HOD (`hod`) users can review pending money requests on `/finance/requests` to either forward them to the CEO (`forwarded_to_ceo`) or reject them with a required reason (`rejected`). CEO/Admin can approve (`approved`) or reject (`rejected`) money requests.
  - **Transfer to Cash Workflow**: When a user records a payment with the mode `transfer_to_cash`, the system MUST automatically generate a linked receipt item for the "Cash" bank account (with payment mode `cash`). When the finance report is approved by the CEO, these linked cash items must automatically sync to the unified Petty Cash Ledger and generate `Transaction` logs.

- **Employee Creation & Role Assignment Rules**:
  - **User Creation Permission Hierarchy**:
    - **Administrator (`admin`)**: Can create any account role (`admin`, `ceo`, `hod`, `report_manager`, `team_lead`, `team_member`) across any workspace.
    - **CEO (`ceo`)**: Can create employee roles (`hod`, `report_manager`, `team_lead`, `team_member`) in their assigned companies or CEO workspace. CEOs cannot create `admin` or `ceo` accounts.
    - **HOD (`hod`)**: Can create down-role accounts (`report_manager`, `team_lead`, `team_member`) within their assigned company workspace.
    - **Report Manager (`report_manager`)**: Can create down-role accounts (`team_lead`, `team_member`) within their assigned company workspace.
    - **Team Lead (`team_lead`)**: Can create `team_member` accounts within their assigned team/company.
  - **Mandatory Team Types**: Team Type selection (`teamNames`) is mandatory when creating or editing Team Lead (`team_lead`) and Team Member (`team_member`) accounts.
  - **HOD Role Rules**: HOD accounts (`role === "hod"`) must NOT have any Team Type (`teamNames = []`) or Skills / Specialties (`roleTypes = []`). HOD's manager is set automatically to the active CEO account.
  - **Report Manager Role Rules**: Report Manager accounts (`role === "report_manager"`) can ONLY see reports (`/reports`) and submit/manage their own reports (`/daily-report/my-reports`). They cannot create or manage employees/users. They have no Team Type or Skills/Specialties. Their manager is assigned to an HOD account.
  - **CEO Employee Creation (`/ceo/users/create`)**: CEO user creation screen does NOT render a Workspace / Company dropdown selection. It automatically binds the active selected company workspace from the header selector (`useSelectedCompany()`) and displays a read-only field labeled **"Company"**.
  - **Team Lead User Creation & Edit Selection Rules**:
    - **User Creation (`/team-lead/users/create`)**: When a Team Lead creates a team member, all assigned teams are displayed as selectable options, but **ONLY ONE team is selected by default** (not all teams). The Team Lead can freely select or deselect any team card.
    - **User Editing (`/team-lead/users/[id]/edit`)**: When editing an existing employee, **all available teams assigned to the Team Lead are displayed** as selectable cards so the Team Lead can update team assignments.
  - **Employee Form Organizational Field Sequence**: Form fields after Company follow the exact sequence: Department -> Role -> Team Type -> Manager -> Skills.

- **Team Type Creation Rules**:
  - Team Creation form requires **Department** (mandatory) and **Team Name** (required).
  - Field ordering: Department selection appears first, followed by Team Name.
  - Status defaults automatically to `Active` (`isActive: true`) on creation.
  - Form UI must NOT display internal name callouts, "Created by", or "Created at" metadata boxes.

- **Senior Report Verification & Approval Hierarchy**:
  - **Team Member Reports (TM to TL)**: Every daily report submitted by a Team Member (`team_member`) must be reviewed, verified, and approved by their assigned **Team Lead (`team_lead`)**. Upon approval, `verificationLevel` is marked as `tl` ("Verified by Team Lead").
  - **Team Lead Reports (TL to HOD)**: Every daily report submitted by a Team Lead (`team_lead`) must be reviewed, verified, and approved by their assigned **HOD (`hod`)**. Upon approval, `verificationLevel` is marked as `hod` ("Verified by HOD").
  - **Rejection & Feedback**: Seniors can reject reports with required review feedback notes, which immediately alerts the employee to rectify and resubmit.

---

## 2. Workspace & Company Management

- **Workspace Types (`company` & `ceo`) & Mandatory Owner Workspace**:
  - Workspaces support two explicit types: **`company`** (individual organization/business unit) and **`ceo`** (executive oversight workspace).
  - **Mandatory Owner Workspace**: Every workspace of type **`company`** MUST have an assigned Owner Workspace (`ownerWorkspaceId` of type `ceo`). Creating or editing a company workspace without an assigned owner workspace is strictly forbidden. For CEO creators, `ownerWorkspaceId` is bound automatically to their active CEO workspace.
  - Configured during workspace creation/edition via `/admin/companies`.
  - Users can be added directly into a CEO Workspace or a Company Workspace during user creation/edition.
  - **Company List Filtering (`type !== 'ceo'`)**: Company Directory endpoints (`/api/admin/companies` and `/api/companies`) must ONLY return workspaces of type `company` (or `type: { $ne: 'ceo' }`). Workspaces of type `ceo` are internal executive workspaces and must NEVER be listed in the companies directory.

- **No System Default Workspace**:
  - Do NOT auto-create a `"Default Workspace"` or default code `"DEF"`.
  - Workspaces are created and managed explicitly by Administrators and CEOs via `/admin/companies`.

- **No System Default Team Types**:
  - Do NOT auto-seed default team types (`DEFAULT_TEAM_TYPE_SEEDS = []`).
  - Team types are configured dynamically through the Team Types management interface.

- **Header Selection Rules By User Role**:
  - **CEO (`ceo`)**: Header selection renders **Companies** (`"All Companies"` + active company list).
  - **HOD (`hod`)**: Header selection renders **Departments** (`"All Departments"` + assigned department options).
  - **Team Lead (`team_lead`)**: Header selection renders **Teams** (`"All Teams"` + assigned team names).
  - **Team Member (`team_member`)**: Header selection renders **Teams** (`"All Teams"` + assigned team names).
  - **Admin (`admin`)**: Header selection renders **CEOs** (`"All CEOs"` + individual CEO accounts).
  - **Reactive Screen Reloading & Aggregation**:
    - Selecting any option directly updates state in `localStorage` (`daily_report_selected_department` for Teams/Departments or `daily_report_selected_company` for Companies/CEOs), dispatches custom events (`department-changed` / `company-changed`), invalidates query caches (`queryClient.invalidateQueries()`), and reloads all screen data reactively for that context.
    - Selecting `"All"` (`"all"` / `"All"`) aggregates and displays all data across all teams/departments/companies without restricting items.

- **Workspace-Scoped API Responses & Dynamic Dashboards**:
  - All API data endpoints scope their responses according to the selected context (`workspaceId`, `team`, or `department`), passed via query params or request headers. When `"all"` is selected, response aggregates data across all teams/departments/companies.
  - **Strict Departmental Data Constraint (HOD & Report Managers)**: When HODs or Report Managers select "All Departments" (`department=all`), APIs MUST NOT return data for all departments company-wide. The API response must strictly aggregate data ONLY from the specific departments explicitly assigned to that user in their active `WorkspaceMember` profile (via `getVisibleReportEmployeeIds` or equivalent).
  - Changing the active selection dynamically updates all dashboard metrics, stat cards, review queues, and financial snapshots.

- **Standardized API Response Structure**:
  - Every API response MUST follow a consistent JSON payload structure:
    - `success`: Boolean (`true` / `false`)
    - `status`: String indicator (e.g., `"SUCCESS"`, `"ERROR"`, `"VALIDATION_ERROR"`, `"UNAUTHORIZED"`)
    - `statusCode`: Number representing a **Custom Application Numeric Status Code** (e.g., `1001` for Login Success, `1002` for Login Error, `2001` for User Created, `4001` for Validation Error, `4003` for Unauthorized Access)
    - `message`: String human-readable message (e.g., `"User created successfully"`, `"Invalid user payload"`)
    - `data`: Payload content (Object or Array)
    - `pagination`: Pagination metadata object (`{ page, limit, total, totalPages }` or `null` if unpaginated)

---

## 3. Technology Stack & Directory Structure

- **Framework**: Next.js (App Router, Server & Client Components)
- **Styling**: Tailwind CSS & Lucide Icons
- **Database & State**: MongoDB via Mongoose, TanStack React Query
- **Testing**: Vitest (`npx vitest run`)

### Key Directories
- `app/admin/` — Administrator command center routes (`/admin/*`).
- `app/ceo/` — CEO executive command center routes (`/ceo/*`).
- `app/hod/` — HOD department management routes (`/hod/*`).
- `app/report-manager/` — Report Manager management routes (`/report-manager/*`).
- `app/team-lead/` — Team Lead dedicated folder and routes (`/team-lead/*` for dashboard, my-reports, users, reports, consolidated-reports).
- `components/layout/` — `AppShell`, `Sidebar`, and `CompanySelector` components.
- `components/admin/admin-dashboard-content.tsx` — Reactive Admin Dashboard.
- `components/dashboard/operations-dashboard-content.tsx` — Reactive Operations Dashboard.
- `lib/constants.ts` — Navigation constants (`SIDEBAR_NAV_ITEMS_BY_ROLE`, `ADMIN_SIDEBAR_ITEMS`, `TEAM_LEAD_SIDEBAR_ITEMS`).
- `lib/permissions.ts` — Permission helpers (`canAccessAdminArea`, `canManageUsers`, etc.).
- `lib/validation.ts` — Zod schemas (`adminCreateUserSchema`, `adminUpdateUserSchema`).
- `lib/bootstrap.ts` — System bootstrap and default admin setup.

---

## 4. Development & Verification Workflow

1. **Rule Maintenance**: Whenever a new rule or behavioral requirement is specified by the user, update `AGENTS.md` immediately.
2. **Strict Logic Inspection**: Inspect relevant source code before modifying data structures or schemas.
3. **Automated Testing**: Run `npx vitest run` to ensure all tests pass cleanly before completing any task.
4. **No Phantom Artifacts**: Do not auto-generate placeholder data, default workspaces, or default team types without explicit user requirement.
