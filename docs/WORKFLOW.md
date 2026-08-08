# System Workflow & Schema Documentation

This document outlines the refactored logic for user creation, department hierarchies, reporting workflows, and access controls in the Daily Report Management System.

## 1. Department Breakdown (Multi-Select & Sub-Teams)

The organizational structure is strictly categorized into primary departments. Employees can belong to **one or more** of these departments simultaneously.

### Available Departments
1. **Construction**
2. **Software**
3. **Finance**
4. **Marketing**
   - When an employee is assigned to the `Marketing` department, an additional **sub-team type** must be selected.
   - The available sub-teams for Marketing are: `Physical`, `Digital`, or Both.

**Backend Implementation:**
On the database level, this is handled via a `departments` array on the User profile:
```json
"departments": [
  { "name": "Software", "subTeams": [] },
  { "name": "Marketing", "subTeams": ["Digital"] }
]
```

## 2. User Creation Flow

When an administrator adds a new employee, the following logical steps occur:
1. **Basic Information:** Admin enters Name, Email, Password, etc.
2. **Role Assignment:** Admin selects a Role (e.g., `Employee`, `Team Lead`, `Report Manager`, `HOD`).
3. **Department Assignment (Multi-Select):**
   - Admin can check multiple boxes for `Construction`, `Software`, `Finance`, `Marketing`.
   - If `Marketing` is checked, the UI reveals checkboxes for `Physical` and `Digital` sub-teams.
4. **Validation:** The system validates that `subTeams` are only populated if the selected department is `Marketing`.

## 3. Role & Reporting Rules Matrix

Access controls for viewing and approving reports are strictly scoped based on Role and Department assignment.

| Role | Viewing Scope | Workflow & Restrictions |
| :--- | :--- | :--- |
| **Employee** | Only their own reports. | Submits daily operations or finance reports. |
| **Team Lead** | Direct team members only. | - Can view `Construction` reports which now utilize a specialized backend schema mirroring the ENGINEER DAILY REPORT template (tracking Work Plan, Materials, etc.).<br>- Can view `Finance` reports ONLY if the Team Lead themselves is in the Finance department. |
| **Report Manager** | Strict Subset of Employees. | **RESTRICTED SCOPE:** Can ONLY view reports for employees in `Software` or `Marketing (Digital)`. All other departments are strictly blocked. |
| **Finance HOD** | Finance team reports. | Reviews pending Finance reports and **forwards** them to the CEO. |
| **CEO / Admin** | All Employees / All Reports. | Has final authority to **Approve** or **Reject** Finance reports. |

## 4. Finance Report Decoupling

Finance Reports are entirely decoupled from standard multi-department Consolidated Reports.
- When generating a "Consolidated Report", all Finance data is explicitly excluded.
- Finance Reports have a specialized two-step approval pipeline:
  1. **Submit:** Finance team member submits the report (`pending`).
  2. **Forward:** Finance HOD reviews and clicks "Forward to CEO" (`forwarded_to_ceo`).
  3. **Approve/Reject:** The CEO provides final authorization (`approved` or `rejected`).

## 5. Reset & Restore Procedures (Idempotent Seeder)

To restore the default administrative credentials or reset the department taxonomy without duplicating existing records, you can execute the seed script.

**Steps:**
1. Open your terminal in the root of the project.
2. Run the following command:
   ```bash
   node seed.js
   ```
3. The script will securely verify and upsert the taxonomy configurations and create/reset the default Admin user.
4. **Default Admin Login:**
   - **Email:** `admin@gmail.com`
   - **Password:** `Admin@123@`
