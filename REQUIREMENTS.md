# Project Requirements & Feature Backlog

This document serves as the single source of truth for all software requirements, feature backlogs, change requests, and technical implementation tasks for the **Daily Report Management System**.

---

## 📋 Requirements Overview & Tracking Matrix

| ID | Feature / Module | Target Roles | Status | Priority | Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-001` | Core Daily Report Entry & Review Pipeline | `team_member`, `team_lead`, `report_manager` | ✅ Completed | High | Phase 1 |
| `REQ-002` | Multi-Role Authentication & Access Control (RBAC) | All Roles | ✅ Completed | High | Phase 1 |
| `REQ-003` | Finance Report Module & SAR/INR Payout Engine | `finance_team`, `ceo`, `admin` | 🚧 In Progress | High | Phase 2 |
| `REQ-004` | Executive Consolidated Daily/Weekly Reports | `ceo`, `report_manager`, `hod` | ✅ Completed | Medium | Phase 2 |
| `REQ-005` | Leave Request Application & Approval Flow | `team_member`, `report_manager` | ✅ Completed | Medium | Phase 2 |
| `REQ-006` | System Audit Trails & In-App Notifications | `admin`, All Users | 🚧 In Progress | Medium | Phase 3 |
| `REQ-007` | Excel/CSV Data Export for Financials & Reports | `finance_team`, `admin`, `ceo`, `report_manager` | 📌 Backlog | High | Phase 4 |
| `REQ-011` | Standalone Consolidated Reports Route & Department Filtering | All Authorized Roles | ✅ Completed | High | Phase 3 |
| `REQ-012` | Restrict Department Filter Options to User's Enrolled Departments | Department Roles | ✅ Completed | High | Phase 3 |
| `REQ-013` | Comprehensive Department Resolution Matching Employee IDs & Teams | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-014` | Align Consolidated Reports Query Visibility with Team Reports | All Authorized Roles | ✅ Completed | High | Phase 3 |
| `REQ-015` | Fix 403 Forbidden for Enrolled Users Accessing Finance Department Reports | Enrolled Roles | ✅ Completed | High | Phase 3 |
| `REQ-016` | Support Finance Department Detailed Summaries & PDF Export | Enrolled Roles | ✅ Completed | High | Phase 3 |
| `REQ-017` | Hierarchical Report Verification Pipeline (TL→TM, HOD→TL, CEO Overview & Review Details) | `team_lead`, `hod`, `ceo` | ✅ Completed | High | Phase 3 |
| `REQ-018` | Render Verification & Review Feedback Details in Report Preview & PDF | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-019` | Enforce HOD Review Stage on TL Reports Before Showing to CEO | `team_lead`, `hod`, `ceo` | ✅ Completed | High | Phase 3 |
| `REQ-020` | Prevent Self-Verification/Self-Review of Reports across UI and API | All Reviewer Roles | ✅ Completed | High | Phase 3 |
| `REQ-021` | Decouple Role-Specific Prefixes (`report-manager`) into Clean Top-Level Routes (`/reports`, `/dashboard`, `/users`) | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-022` | Display All Team Names & Relabel "Team Lead" to "Manager" on Profile Screen | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-023` | Add Department Field Before Teams Field on Profile Screen | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-024` | Sanitize Snake-Case Internal Identifiers Across All Application Screens & PDF Exports | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-025` | Fix Variable Declaration & Department Consolidated Report Resolution | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-026` | Hierarchical Review Button Guard for HOD & TL (Skip HOD review if TM report verified by TL; Allow HOD review if TL unverified; HOD reviews TL) | `team_lead`, `hod`, `ceo` | ✅ Completed | High | Phase 3 |
| `REQ-027` | Fix Rupee Symbol Rendering in Downloaded PDF Reports (Use PDF-Safe Currency Prefix `Rs.`) | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-028` | Align Finance PDF Report UI 1:1 with Web UI Preview Screen | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-029` | Configure Standard A4 Page Format (`size: "A4"`) for All PDF Report Exports | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-030` | Add "Download Approvals Only" Option to Finance Report Export | `finance_team`, `ceo` | ✅ Completed | Medium | Phase 3 |
| `REQ-031` | Standardize Circular Icon-Only Back Button Layout on Left of Title Across Screens | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-032` | Add Description Field to Expenses, Receipts, Payments, and Next Day Approvals | `finance_team`, `ceo`, `admin` | ✅ Completed | Medium | Phase 3 |
| `REQ-033` | Add Company Creation & Management for Admin & CEO Roles | `admin`, `ceo` | ✅ Completed | High | Phase 3 |
| `REQ-034` | Add Company Selection List in Header (Right Side, Not in Sidebar) | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-035` | Remove Companies Option from Sidebar Navigation | `admin`, `ceo` | ✅ Completed | Low | Phase 3 |
| `REQ-036` | Remove "All Companies" Option, Provide Company List, Add Company Modal & Details Modal on Click | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-037` | Direct "+ Add Company" Header Dropdown Action to Full Company Creation Screen | All Roles | ✅ Completed | High | Phase 3 |
| `REQ-008` | Automated Email Digest & Slack/Teams Webhooks | All Managers & Leaders | 📌 Backlog | Medium | Phase 5 |
| `REQ-009` | Executive Visual Analytics & Performance Charts | `ceo`, `hod`, `admin` | 📌 Backlog | Medium | Phase 5 |
| `REQ-010` | Multi-Language Localization (English / Arabic) | All Roles | 📌 Backlog | Low | Phase 5 |

---

## 🚀 Active Requirements Specifications

### `REQ-037`: Full Company Creation Screen Navigation *(Active Target)*
- **Objective**: Direct clicking on "+ Add Company" in the header dropdown menu to open the full company creation management screen at `/admin/companies?create=true` with the creation form pre-opened.
- **Key Implementation**:
  1. Allow authenticated users access to `/admin/companies/page.tsx`.
  2. Update `CompaniesManager` component to detect `create=true` URL search param and automatically display the full creation form.
  3. Wire `handleOpenFullCreateScreen` in `CompanySelector` to navigate directly to `/admin/companies?create=true`.

---

## 📝 Change Log & Requirement History

| Date | Requirement ID | Author | Description of Change |
| :--- | :--- | :--- | :--- |
| 2026-08-10 | `REQ-001` - `REQ-006` | System Architect | Initial baseline requirements defined and scaffolded. |
| 2026-08-10 | `REQ-007` - `REQ-010` | Product Team | Created master `REQUIREMENTS.md` tracker & workspace `.agents/AGENTS.md` rule. |
| 2026-08-10 | `REQ-011` | User & AI Assistant | Added requirement `REQ-011` for standalone `/consolidated-reports` route & department/role filtering. |
| 2026-08-10 | `REQ-012` | User & AI Assistant | Added `REQ-012` to restrict department filter dropdown options to user's enrolled departments. |
| 2026-08-10 | `REQ-013` | User & AI Assistant | Added `REQ-013` for comprehensive department resolution matching employee IDs & teams. |
| 2026-08-10 | `REQ-014` | User & AI Assistant | Added `REQ-014` to align consolidated report visibility with team reports (`getVisibleReportEmployeeIds`). |
| 2026-08-10 | `REQ-015` | User & AI Assistant | Added `REQ-015` to fix 403 Forbidden when enrolled users query `department=Finance`. |
| 2026-08-10 | `REQ-016` | User & AI Assistant | Added `REQ-016` to support Finance department detailed summaries & PDF export. |
| 2026-08-10 | `REQ-017` | User & AI Assistant | Added `REQ-017` for Hierarchical Verification Pipeline (TL→TM, HOD→TL, CEO Toggle, & Review Details). |
| 2026-08-10 | `REQ-018` | User & AI Assistant | Added `REQ-018` to render verification & review feedback details on report preview screens & PDFs. |
| 2026-08-10 | `REQ-019` | User & AI Assistant | Added `REQ-019` for sequential HOD review of TL reports before presenting to CEO. |
| 2026-08-10 | `REQ-020` | User & AI Assistant | Added `REQ-020` to prevent self-verification and self-review of reports in UI and API. |
| 2026-08-10 | `REQ-021` | User & AI Assistant | Added `REQ-021` to decouple role-specific prefixes into clean top-level routes (`/reports`, `/dashboard`, `/users`). |
| 2026-08-10 | `REQ-022` | User & AI Assistant | Added `REQ-022` to display all team names and relabel "Team Lead" to "Manager" on Profile screen. |
| 2026-08-10 | `REQ-023` | User & AI Assistant | Added `REQ-023` to add Department field before Teams field on Profile screen. |
| 2026-08-10 | `REQ-024` | User & AI Assistant | Added `REQ-024` to sanitize snake-case internal identifiers across all application screens. |
| 2026-08-10 | `REQ-025` | User & AI Assistant | Added `REQ-025` to fix variable declaration and consolidated department report resolution. |
| 2026-08-10 | `REQ-026` | User & AI Assistant | Added `REQ-026` for Hierarchical Review Option Guard for HOD & TL. |
| 2026-08-10 | `REQ-027` | User & AI Assistant | Added `REQ-027` to fix Rupee symbol rendering in PDF downloads using PDF-safe `Rs.` prefix. |
| 2026-08-10 | `REQ-028` | User & AI Assistant | Added `REQ-028` to align Finance PDF report UI 1:1 with Web UI preview screen. |
| 2026-08-10 | `REQ-029` | User & AI Assistant | Added `REQ-029` to configure standard A4 page format (`size: "A4"`) for all PDF exports. |
| 2026-08-11 | `REQ-034` | User & AI Assistant | Added `REQ-034` to display Company selection dropdown list in top header right side. |
| 2026-08-11 | `REQ-035` | User & AI Assistant | Added `REQ-035` to remove Companies link from sidebar navigation menu. |
| 2026-08-11 | `REQ-036` | User & AI Assistant | Added `REQ-036` to remove 'All Companies' option, add company list popover with search, company details modal, and Add Company modal. |
| 2026-08-11 | `REQ-037` | User & AI Assistant | Added `REQ-037` to open full company creation screen at /admin/companies?create=true when clicking '+ Add Company'. |
