# Finance Report Module — Task Tracker

## Phase 1: Foundation (Models, Config, Libraries)
- [x] Add `finance_team` role to `app-data.json`
- [x] Create `FinanceReport` Mongoose model
- [x] Create `Notification` Mongoose model
- [x] Update `AuditLog` model with `financeReportId`
- [x] Update `constants.ts` — role labels, sidebar items, finance statuses
- [x] Update `permissions.ts` — finance permission helpers
- [x] Update `validation.ts` — finance report Zod schema
- [x] Update `audit.ts` — add financeReportId support
- [x] Create `currency.ts` — INR→SAR conversion with caching
- [x] Create `finance-pdf.ts` — PDF generation for finance reports

## Phase 2: API Routes
- [/] `POST/GET /api/finance-reports` — Create & list
- [ ] `GET/PUT/DELETE /api/finance-reports/[id]` — Single report CRUD
- [ ] `POST /api/finance-reports/[id]/approve` — Approve/reject
- [ ] `GET /api/finance-reports/[id]/pdf` — PDF generation
- [ ] `GET /api/finance-reports/dashboard` — Dashboard summary
- [ ] `GET/PATCH /api/notifications` — Notification endpoints
- [ ] `GET /api/exchange-rate` — Exchange rate endpoint

## Phase 3: Frontend Pages & Components
- [ ] Create `finance-report-form.tsx` component
- [ ] Create `finance-report-detail.tsx` component
- [ ] Create `finance-dashboard-section.tsx` component
- [ ] Create `notification-bell.tsx` component
- [ ] Create `app/finance/page.tsx` — Finance listing page
- [ ] Create `app/finance/create/page.tsx` — Create page
- [ ] Create `app/finance/[id]/page.tsx` — Detail/edit page

## Phase 4: Integration & Polish
- [ ] Update `middleware.ts` — Finance route protection
- [ ] Update `app-shell.tsx` — Add notification bell
- [ ] Update `dashboard/page.tsx` — Add finance section
- [ ] Update `admin/dashboard/page.tsx` — Add finance section

## Phase 5: Verification
- [ ] Run `npm run build` — TypeScript check
- [ ] Run `npm run lint` — Lint check
- [ ] Fix any build/lint errors
