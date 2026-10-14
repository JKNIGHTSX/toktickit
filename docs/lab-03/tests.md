# Lab 3 Test Plan and Traceability Matrix — TokTickIT

## 1. Test Strategy

The testing strategy for TokTickIT Lab 3 follows **Test-Driven Design (Test DD)** and **Spec DD** principles. It establishes full-stack verification across unit, integration/API, UI component, authorization/security, regression, and end-to-end (E2E) testing layers.

```text
                      +-----------------------------+
                      |          E2E Tests          |  Playwright
                      |     (e2e/lab-03/*.spec.ts)  |  (Full journeys: Auth, Queue, Admin)
                      +-----------------------------+
                      |       UI Component &        |  Vitest + React Testing Library
                      |     Responsive Style Tests  |  (Forms, tables, modals, badges, states)
                      +-----------------------------+
                      |      API & Integration      |  Supertest + Vitest
                      |            Tests            |  (Endpoints, DB queries, Authz matrix)
                      +-----------------------------+
                      |          Unit Tests         |  Vitest
                      | (Password, Validators, RBAC)|  (Bcrypt, policy checks, state transitions)
                      +-----------------------------+
```

1. **Unit Tests**: Verify isolated functions (bcrypt hashing, password strength rules, state transition matrix rules, input sanitization).
2. **API & Integration Tests**: Supertest suite against a PostgreSQL test database testing every REST endpoint, session creation/destruction, backend role-based access control, parameter validation, and error envelopes.
3. **UI Component & Style Tests**: Vitest with React Testing Library verifying Login controls, Password Change strength indicators, IT Queue data tables/cards, Comment/Note tabs, Admin Modals, and Zen Green style tokens.
4. **Security & Authorization Tests**: Targeted tests verifying direct HTTP requests across roles to validate server-side enforcement and data isolation (e.g. Requester accessing Internal Notes or Admin APIs returns `403 Forbidden`).
5. **Regression & Migration Tests**: Verifying that all Lab 2 ticket creation, attachment upload, soft-removal, and reference data APIs remain fully operational under the authenticated user model.
6. **End-to-End (E2E) Tests**: Playwright tests executing complete user workflows in real browser viewports (Desktop, Tablet, Mobile).

---

## 2. Planned Tests Table

| Test ID | Type | Requirement / AC | What It Tests / Scenario | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-01** | Unit | BR-03, BR-05 | Password Policy Validator | Validates 8+ chars, uppercase, lowercase, digit, special character | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **UT-02** | Unit | BR-14 | State Transition Matrix Rule Engine | Verifies permitted transitions (`NEW`->`OPEN`, `IN_PROGRESS`->`RESOLVED`, etc.) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **UT-03** | Unit | BR-16, BR-18 | Comment & Note Content Trimming | Trims whitespace, rejects empty/whitespace-only content | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-01** | API | FR-01, AC-01 | `POST /api/auth/login` (Valid credentials) | `200 OK`, sets HTTP-only session cookie, returns user & role | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | API | BR-01, BR-02 | `POST /api/auth/login` (Invalid pass / Inactive) | `401 Unauthorized` with safe error message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | API | FR-03, AC-05 | `POST /api/auth/logout` | `200 OK`, invalidates server session and clears auth cookie | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | FR-02, AC-03 | Protected API with `mustChangePassword=true` | `403 Forbidden` (`MUST_CHANGE_PASSWORD` code) | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | API | FR-02, AC-04 | `POST /api/auth/change-password` | Updates password, sets `mustChangePassword=false`, `200 OK` | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-06** | API | FR-04, AC-06 | `POST /api/tickets` (Authenticated Requester) | `201 Created`, ticket `requesterId` equals `currentUser.id` | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-07** | API | BR-08, AC-07 | `GET /api/tickets/:id` (Cross-Requester access) | `403 Forbidden` or `404 Not Found` when requesting another user's ticket | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-08** | API | FR-05, AC-08 | `GET /api/tickets` (IT Staff Shared Queue) | `200 OK`, returns paginated tickets for all requesters | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-09** | API | BR-11, AC-09 | `GET /api/tickets?search=battery&status=IN_PROGRESS` | `200 OK`, returns filtered tickets matching search and status | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-10** | API | FR-06, AC-10 | `PATCH /api/tickets/:id/claim` | `200 OK`, sets `ownerId` to `currentUser.id` and status to `OPEN` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-11** | API | FR-06, AC-10 | `PATCH /api/tickets/:id/assign` | `200 OK`, updates ticket `ownerId` to specified IT Staff ID | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-12** | API | FR-07, AC-11 | `PATCH /api/tickets/:id/priority` | `200 OK`, updates `itPriority` to specified enum value | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-13** | API | FR-08, AC-12 | `PATCH /api/tickets/:id/status` (Valid transition) | `200 OK`, updates status to `RESOLVED` with non-empty resolution summary | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-14** | API | BR-15 | `PATCH /api/tickets/:id/status` (Resolve without summary)| `422 Unprocessable` / `400 Bad Request` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-15** | API | FR-09, AC-14 | `POST /api/tickets/:id/comments` | `201 Created`, records comment with author and timestamp | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-16** | API | FR-10, AC-16 | `POST /api/tickets/:id/notes` (IT Staff) | `201 Created`, creates internal note | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-17** | API | BR-18, AC-16 | `POST /api/tickets/:id/notes` (Requester) | `403 Forbidden`, internal note creation strictly blocked | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-18** | API | BR-18, AC-16 | `GET /api/tickets/:id/notes` (Requester) | `403 Forbidden`, internal notes listing strictly blocked | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-19** | API | FR-11, AC-18 | `GET /api/users` (Administrator) | `200 OK`, lists all users with search/role filters | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-20** | API | BR-20, AC-18 | `GET /api/users` (Non-Admin: IT Staff / Requester) | `403 Forbidden` | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-21** | API | FR-12, AC-19 | `POST /api/users` (Valid payload) | `201 Created`, creates user account with `mustChangePassword=true` | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-22** | API | BR-22, AC-20 | `POST /api/users` (Duplicate email) | `409 Conflict` with clear error detail | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-23** | API | BR-23, AC-22 | `PATCH /api/users/:id` (Self-Deactivation) | `400 Bad Request` ("Cannot deactivate your own account") | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-24** | API | BR-24, AC-23 | `PATCH /api/users/:id` (Deactivate last Admin) | `400 Bad Request` ("At least one active Administrator must remain") | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-25** | API | FR-14, AC-24 | `POST /api/users/:id/reset-password` | `200 OK`, updates password hash and sets `mustChangePassword=true` | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **UI-01** | UI | AC-01, AC-02 | Login Form Component | Renders inputs, handles submission, displays inline/banner errors | `client/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | UI | AC-03, AC-04 | Change Password Component | Renders password rules checklist, validates matching confirm input | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-03** | UI | AC-08, AC-09 | Staff Ticket Queue Component | Renders data grid, handles search input, filters, and pagination | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| **UI-04** | UI | AC-10, AC-17 | Staff Ticket Detail Component | Renders editable controls, Public Comments tab, amber Internal Notes tab | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-05** | UI | AC-18 to 24| Admin User Management Component | Renders user list, search, role filter, Create/Edit modals, safety alerts | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| **E2E-01**| E2E | AC-01 to 05| Login & Initial Password Journey | Full browser test: Login with initial pass -> Forced redirect -> Save pass -> Shell | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02**| E2E | AC-08 to 17| IT Staff Ticket Management Journey | Full browser test: View Queue -> Search/Filter -> Claim -> Update Priority/Status -> Comment & Note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| **E2E-03**| E2E | AC-18 to 24| Admin User Management Journey | Full browser test: Login Admin -> Create User -> Edit Role -> Trigger Safety Rules -> Reset Password | `e2e/lab-03/user-administration.spec.ts` | Pass |
| **E2E-04**| E2E | Responsive | Responsive and Visual QA | Desktop (1200×800), Tablet (768×1024), Mobile (375×667) across Login, Change Password, Staff Queue, Staff Detail, User Management — no horizontal overflow | `e2e/lab-03/responsive-visual-qa.spec.ts` | Pass |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Functional Requirements | Business Rules | Automated Test IDs |
| :--- | :--- | :--- | :--- |
| **AC-01** (Valid Login) | FR-01 | BR-01, BR-03 | `API-01`, `UI-01`, `E2E-01` |
| **AC-02** (Inactive Login Rejection) | FR-01 | BR-01, BR-02 | `API-02`, `UI-01` |
| **AC-03** (Mandatory First Password Intercept) | FR-02 | BR-04 | `API-04`, `UI-02`, `E2E-01` |
| **AC-04** (Password Change Validation) | FR-02 | BR-05 | `UT-01`, `API-05`, `UI-02`, `E2E-01` |
| **AC-05** (Logout Security) | FR-03 | BR-06 | `API-03`, `E2E-01` |
| **AC-06** (Requester Auth Context) | FR-04 | BR-07 | `API-06` |
| **AC-07** (Requester Data Isolation) | FR-04 | BR-08 | `API-07` |
| **AC-08** (IT Staff Queue Retrieval) | FR-05 | BR-10 | `API-08`, `UI-03`, `E2E-02` |
| **AC-09** (IT Queue Search & Filtering) | FR-05 | BR-11 | `API-09`, `UI-03`, `E2E-02` |
| **AC-10** (Ticket Ownership Claim & Reassign) | FR-06 | BR-12 | `API-10`, `API-11`, `UI-04`, `E2E-02` |
| **AC-11** (IT Priority Update) | FR-07 | BR-13 | `API-12`, `UI-04`, `E2E-02` |
| **AC-12** (Permitted Status Transitions) | FR-08 | BR-14, BR-15 | `UT-02`, `API-13`, `API-14`, `E2E-02` |
| **AC-13** (Requester Problem Resolved Indication)| FR-08 | BR-09, BR-14 | `API-13`, `UI-04` |
| **AC-14** (Public Comments Post & Read) | FR-09 | BR-16, BR-17 | `UT-03`, `API-15`, `UI-04`, `E2E-02` |
| **AC-15** (Public Comments Immutability) | FR-09 | BR-17 | `UT-03`, `UI-04` |
| **AC-16** (Internal Notes Access Control) | FR-10 | BR-18, BR-19 | `UT-03`, `API-16`, `API-17`, `API-18`, `E2E-02` |
| **AC-17** (Internal Notes Visual Separation) | FR-10 | BR-18 | `UI-04`, `E2E-02` |
| **AC-18** (Admin User List Retrieval) | FR-11 | BR-20 | `API-19`, `API-20`, `UI-05`, `E2E-03` |
| **AC-19** (Admin User Creation) | FR-12 | BR-21, BR-22 | `API-21`, `UI-05`, `E2E-03` |
| **AC-20** (Duplicate Email Prevention) | FR-12, FR-13 | BR-22 | `API-22`, `UI-05` |
| **AC-21** (Admin User Editing) | FR-13 | BR-21, BR-23 | `API-23`, `UI-05`, `E2E-03` |
| **AC-22** (Admin Self-Deactivation Guardrail) | FR-13 | BR-23 | `API-23`, `UI-05`, `E2E-03` |
| **AC-23** (Last Admin Protection) | FR-13 | BR-24 | `API-24`, `UI-05`, `E2E-03` |
| **AC-24** (Admin Reset Initial Password) | FR-14 | BR-22 | `API-25`, `UI-05`, `E2E-03` |
| **AC-25** (Regression Continuity) | FR-04 | BR-07, BR-08 | `API-06`, `API-07` |

---

## 4. Final Test Run Results

### Server (Vitest — Unit + API/Integration)

- **18 test files** | **218 tests passed** | 0 failed
- Key suites: `auth.api` (15), `authorization.api` (14), `staff-queue.api` (37), `staff-ticket-detail.api` (22), `comments-notes.api` (6), `users-admin.api` (19), `user-foundation.api` (11), plus all Lab 2 regression suites

### Client (Vitest — UI Component)

- **14 test files** | **112 tests passed** | 0 failed
- Key suites: `Login` (5), `ChangePassword` (4), `StaffTicketQueue` (20), `StaffTicketDetail` (3), `TicketDetailAssignment` (9), `UserManagement` (9), plus all Lab 2 component suites

### E2E (Playwright — End-to-End + Responsive)

- **18 tests passed** | 0 failed (across 6 spec files)
- Lab 3: `authentication.spec.ts` (4), `staff-ticket-flow.spec.ts` (1), `user-administration.spec.ts` (1), `responsive-visual-qa.spec.ts` (5)
- Lab 2: `requester-ticket-flow.spec.ts` (1), `responsive-visual-qa.spec.ts` (6)

### Responsive Screenshots Generated

All 15 screenshots saved to `artifacts/lab-03/screenshots/`:
- `authentication/` — desktop, tablet, mobile, change-password-desktop, change-password-tablet, change-password-mobile
- `staff-queue/` — desktop, tablet, mobile
- `staff-ticket-detail/` — desktop, tablet, mobile
- `user-management/` — desktop, tablet, mobile

### Defects Found and Fixed During QA

1. **AuthContext login/logout loading state** — `setIsLoading(true)` in `login`/`logout` caused `AppContent` to unmount the Login component during form submission, wiping error state on 401. Fixed by removing the global loading toggle from `login`/`logout`.
2. **`user-foundation.api.test.ts` bcrypt assertion** — `findMany()` returned dynamically created E2E test users whose passwords differ from seed default. Fixed by scoping the `bcrypt.compare` check to known seeded user emails.
3. **E2E `getByText("IT Staff")` strict mode violation** — Ticket titles containing "IT Staff" substring caused multiple matches. Fixed with `{ exact: true }`.
4. **Responsive visual QA race conditions** — `page.goto("/")` in viewport loops with active sessions caused login form DOM detachment. Fixed by logging in once upfront and resizing viewport without re-navigating.

