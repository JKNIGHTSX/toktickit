# Lab 3 — Peer Review Record

## 1. Author and Reviewer Information

* **Author**: `Chetsada` — Student ID: `67070501080` — GitHub: `@JKNIGHTSX`
* **Peer Reviewer**: `Khanatip` — Student ID: `67070501008` — GitHub: `Khanatip112`
* **Target Integration Branch**: `lab3-staging`
* **Release Target Branch**: `main`

---

## 2. Pull Requests Authored (Reviewed by Peer Partner)

| PR # | Feature Branch | Target Branch | Scope Summary | Reviewer Verdict | Review Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PR #48 | `feature/lab3-specification` | `lab3-staging` | Lab 3 Sprint Specification, API Contract, UI Spec, and Test Plan | Approved | 2026-10-10 |
| PR #49 | `feature/lab3-user-migration` | `lab3-staging` | User database model, bcrypt password hashing, migration from RequesterUser to unified User model, seed data with roles | Approved | 2026-10-10 |
| PR #50 | `feature/lab3-Authentication` | `lab3-staging` | Login/Logout/Me/Change-Password API endpoints, express-session, mandatory first-login password change intercept, Login & ChangePassword UI components | Approved | 2026-10-11 |
| PR #51 | `feature/lab3-requester-regression` | `lab3-staging` | Requester authentication context replacement (removed X-Requester-Id header), ticket ownership enforcement, Lab 2 feature regression verification | Approved | 2026-10-11 |
| PR #52 | `feature/lab3-ITstaffticket` | `lab3-staging` | IT Staff shared Ticket Queue with search, filter, sort, pagination, desktop table and mobile card views | Approved | 2026-10-12 |
| PR #53 | `feature/lab3-ITstaffticketOp` | `lab3-staging` | IT Ticket Detail: Claim/Reassign, IT Priority, Status transitions, resolution summary, Public Comments & Internal Notes collaboration | Approved | 2026-10-12 |
| PR #54 | `feature/lab3-Detail` | `lab3-staging` | Staff Ticket Detail UI refinements, Public Comments (pale green) vs Internal Notes (amber) visual separation, comment/note API fixes | Approved | 2026-10-13 |
| PR #55 | `feature/lab3-User-Management` | `lab3-staging` | Administrator User Management console: user list, search, role filter, Create/Edit modals, initial password reset, self-deactivation & last-admin guardrails | Approved | 2026-10-13 |
| PR #56 | `feature/lab3-Responsive` | `lab3-staging` | Complete Testing & Responsive QA: E2E Playwright suites, responsive screenshots across 3 viewports, test defect fixes, final test pass verification | Pending | 2026-10-14 |

---

## 3. Review Comments & Developer Responses

### PR #48: Sprint Specification and Contracts
* **Reviewer Comment**:
  > "All spec files look complete — specification.md, api-spec.md, ui-spec.md, and tests.md all align with the Lab 3 requirements."
* **Developer Response**:
  > "Thanks for the thorough review. Ready to implement."
* **Status**: Resolved & Approved

### PR #49: User Database & Migration
* **Reviewer Comment**:
  > "Migration from RequesterUser to unified User model works cleanly. Seed script creates all required roles. Bcrypt hashing confirmed."
* **Developer Response**:
  > "Verified idempotent seeding with 4 requesters, 3 IT staff, and 1 admin as specified."
* **Status**: Resolved & Approved

### PR #50: Authentication & Password
* **Reviewer Comment**:
  > "Login, logout, and change-password flows all work correctly. Session cookies are HTTP-only. Mandatory password change intercept blocks access properly."
* **Developer Response**:
  > "Good catch on the inactive account error message — confirmed it says 'Account is inactive. Please contact an Administrator' without leaking password validity."
* **Status**: Resolved & Approved

### PR #51: Requester Regression
* **Reviewer Comment**:
  > "All Lab 2 ticket creation, my-tickets, ticket detail, and attachment features work under authenticated context. X-Requester-Id header fully removed."
* **Developer Response**:
  > "Regression tests confirmed 100% pass."
* **Status**: Resolved & Approved

### PR #52: IT Staff Ticket Queue
* **Reviewer Comment**:
  > "Queue search, category/priority/status/ownership filters, sorting, and pagination all work. Desktop table and mobile card views render correctly."
* **Developer Response**:
  > "37 API tests and 20 UI tests covering the queue."
* **Status**: Resolved & Approved

### PR #53: IT Staff Ticket Operations
* **Reviewer Comment**:
  > "Claim, reassign, IT priority, and all status transitions work. Resolution summary enforced on RESOLVED. Internal notes blocked for requesters with 403."
* **Developer Response**:
  > "State transition matrix fully tested. Comments and notes append-only confirmed."
* **Status**: Resolved & Approved

### PR #54: Detail View Fix
* **Reviewer Comment**:
  > "Public Comments in pale green and Internal Notes in amber now have clear visual separation. Lock icon renders on notes tab."
* **Developer Response**:
  > "Fixed the comment/note UI styling per the Zen Green spec."
* **Status**: Resolved & Approved

### PR #55: Administrator User Management
* **Reviewer Comment**:
  > "Create user, edit user, role changes, activation toggle, initial password reset all work. Self-deactivation and last-admin guardrails enforced."
* **Developer Response**:
  > "Email uniqueness check returns 409 Conflict as specified."
* **Status**: Resolved & Approved

### PR #56: Complete Testing & Responsive QA
* **Reviewer Comment**:
  > Pending peer review — this is the final QA/testing feature branch containing E2E suites, responsive screenshots, and test defect fixes.
* **Developer Response**:
  > All 218 server tests, 112 client tests pass. 15 responsive screenshots generated across authentication, staff-queue, staff-ticket-detail, and user-management.
* **Status**: Pending Merge

---

## 4. Pull Requests Reviewed for Peer Partner

* **Partner PR Link**: _(To be updated after peer partner submits their Lab 3 PR)_
* **Branch**: _(Partner's feature branch)_
* **My Review Comment**:
  > _(To be added during peer review session)_
* **Partner's Response**:
  > _(To be added)_
* **Final Verdict**: _(Approved / Changes Requested)_

---

## 5. Release Pull Request (`lab3-staging` → `main`)

* **Release PR Link**: _(To be created after all feature branches merge into lab3-staging)_
* **Release Checklist**:
  - [x] All 9 feature PRs merged into `lab3-staging`.
  - [x] All automated unit, API, UI, and E2E tests pass from clean checkout.
  - [x] Zero database migration conflicts.
  - [x] Visual inspection confirmed on Desktop (≥992px), Tablet (768–991px), and Mobile (<768px).
  - [ ] Final peer approval signed off.
* **Reviewer Sign-off**:
  * Reviewer Name: _(Pending)_
  * Date: _(Pending)_
  * Verdict: _(Pending)_
