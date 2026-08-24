# Agent Rules & Guidelines

This document outlines the coding standards, architectural patterns, role permissions, and development workflow rules for the **Daily Report Management System**.

---

## 1. Role & Permission Architecture

- **Executive & Administrative Roles (`admin`, `ceo`)**:
  - Full access to administrative command center (`/admin/*`).
  - Access to Companies Management (`/admin/companies`), Users (`/admin/users`), Team Types (`/admin/team-types`), Reports (`/admin/reports`), Consolidated Reports (`/consolidated-reports`), Finance (`/finance`), Leave Requests (`/leave-requests`), Settings (`/admin/settings`), and Audit Logs (`/admin/audit-logs`).
  - Admin and CEO sidebar configurations are separate: the CEO's sidebar does not contain the Companies or CEO options. The Admin's sidebar also does not contain the CEO option.
  - Executive roles (`admin` and `ceo`) exist at the system level and bypass mandatory `workspaceId` checks during user creation and authentication.
  - **CEO Workspace Scoping**: Unlike globally unbound Administrators (`admin`), the CEO role is bound to workspaces via active `WorkspaceMember` memberships. CEOs can only see, access, and manage database records (users, reports, audit logs, dashboard stats) belonging to workspaces where they hold active memberships.
  - **Only Administrators (`admin`) can create or assign a CEO (`ceo`) account.** CEOs cannot create other CEO accounts.
  - **CEO Directory Page (`/admin/users?role=ceo`) & Profile Visibility**:
    - The directory view for CEO accounts displays name and team details with only the "Edit" button shown. The "Report" and "View" buttons are hidden.
    - Clicking on a CEO's info row/list item directly navigates to their detailed view page (`/admin/users/[id]`).
    - **CEO Profile Access**: CEO details (`/admin/users/[id]` and `/api/users/[id]`) can ONLY be accessed, viewed, or edited by Administrators (`admin`) and that specific CEO user themselves (`user.id === targetUser.id`). Other roles attempting to access a CEO profile must be denied access (`403 Forbidden`).
    - The "Team Types" action button is hidden from this view.

- **Role-Based API Authorization Guard**:
  - All API endpoints (except public auth routes `/api/auth/login` and `/api/auth/register`) MUST enforce strict role-based authorization using `authorizeApi(request, allowedRoles)`.
  - Unauthenticated requests trigger `ApiResponse.unauthorized()` (`statusCode: 4003`, `httpStatus: 401`).
  - Unauthorized role requests trigger `ApiResponse.forbidden()` (`statusCode: 4003`, `httpStatus: 403`).

- **Finance & Operational Roles**:
  - Access controlled dynamically via `canViewFinanceReport`, `canForwardFinanceReport`, and `canApproveFinanceReport` in `lib/permissions.ts`.

---

## 2. Workspace & Company Management

- **Workspace Types (`company` & `ceo`)**:
  - Workspaces support two explicit types: **`company`** (individual organization/business unit) and **`ceo`** (executive oversight workspace).
  - Configured during workspace creation/edition via `/admin/companies`.
  - Users can be added directly into a CEO Workspace or a Company Workspace during user creation/edition.
  - **Company List Filtering (`type !== 'ceo'`)**: Company Directory endpoints (`/api/admin/companies` and `/api/companies`) must ONLY return workspaces of type `company` (or `type: { $ne: 'ceo' }`). Workspaces of type `ceo` are internal executive workspaces and must NEVER be listed in the companies directory.

- **No System Default Workspace**:
  - Do NOT auto-create a `"Default Workspace"` or default code `"DEF"`.
  - Workspaces are created and managed explicitly by Administrators and CEOs via `/admin/companies`.

- **No System Default Team Types**:
  - Do NOT auto-seed default team types (`DEFAULT_TEAM_TYPE_SEEDS = []`).
  - Team types are configured dynamically through the Team Types management interface.

- **Header Company Selector (`CompanySelector`) & CEO Selector for Admin**:
  - Displays a list-only dropdown of active companies for non-admin users (do NOT include "+ Add Company" option in header dropdown for non-admin).
  - For **Administrator (`admin`)** role, the header selector renders a **CEO Selector** containing `"All CEOs"`, individual CEO accounts, and an `"+ Add CEO"` option at the bottom.
  - For **CEO (`ceo`)** and other roles, the header selector renders the Company list and **"CEO Workspace (All)"** option.
  - Selecting an item directly changes the active context without showing a confirmation modal or details popup.

- **Workspace-Scoped API Responses & Dynamic Dashboards**:
  - All API data endpoints scope their responses according to the selected company workspace (`workspaceId`), passed via `workspaceId` query param or `x-workspace-id` header (fallback to `user.workspaceId`). When `workspaceId="all"`, response aggregates data across all companies for CEO level access.
  - Changing the active company dynamically updates all dashboard metrics, stat cards, review queues, and financial snapshots for the newly selected company workspace.

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
- `app/admin/companies/` — Company Management view (`CompaniesManager`).
- `components/layout/` — `AppShell`, `Sidebar`, and `CompanySelector` components.
- `components/admin/admin-dashboard-content.tsx` — Reactive Admin Dashboard.
- `components/dashboard/operations-dashboard-content.tsx` — Reactive Operations Dashboard.
- `lib/constants.ts` — Navigation constants (`SIDEBAR_NAV_ITEMS_BY_ROLE`, `ADMIN_SIDEBAR_ITEMS`).
- `lib/permissions.ts` — Permission helpers (`canAccessAdminArea`, `canManageUsers`, etc.).
- `lib/validation.ts` — Zod schemas (`adminCreateUserSchema`, `adminUpdateUserSchema`).
- `lib/bootstrap.ts` — System bootstrap and default admin setup.

---

## 4. Development & Verification Workflow

1. **Rule Maintenance**: Whenever a new rule or behavioral requirement is specified by the user, update `AGENTS.md` immediately.
2. **Strict Logic Inspection**: Inspect relevant source code before modifying data structures or schemas.
3. **Automated Testing**: Run `npx vitest run` to ensure all tests pass cleanly before completing any task.
4. **No Phantom Artifacts**: Do not auto-generate placeholder data, default workspaces, or default team types without explicit user requirement.
