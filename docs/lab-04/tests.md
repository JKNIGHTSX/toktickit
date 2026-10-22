# Lab 4 Test Plan and Traceability Matrix — TokTickIT

## 1. Test Strategy

The testing strategy for TokTickIT Lab 4 enforces **Test-Driven Design (Test DD)**, **Spec DD**, and continuous regression verification across the entire multi-tier stack:

```text
                      +-----------------------------+
                      |          E2E Tests          |  Playwright
                      |     (e2e/lab-04/*.spec.ts)  |  (Actions Taken flow, Resolution gate, Dashboards)
                      +-----------------------------+
                      |       UI Component &        |  Vitest + React Testing Library
                      |     Responsive Style Tests  |  (Dashboards, Action Modals, Lists, Error banners)
                      +-----------------------------+
                      |      API & Integration      |  Supertest + Vitest
                      |            Tests            |  (Endpoints, Prisma queries, RBAC, Concurrency)
                      +-----------------------------+
                      |          Unit Tests         |  Vitest
                      | (Validators, Gate Rules)    |  (Status matrix, follow-up logic, calculations)
                      +-----------------------------+
```

1. **Unit Tests**: Pure functions verifying status state transitions, input validation logic (follow-up notes, min length requirements), and dashboard metric formula calculations.
2. **API & Integration Tests**: Supertest suite against a PostgreSQL test database testing every new endpoint (`/api/tickets/:id/actions`, `/api/actions/:id`, `/api/dashboard/*`, `/api/tickets/:id/status`), verifying role authorization, resolution gates, optimistic concurrency (`updatedAt`), and database constraints.
3. **UI Component & Style Tests**: Vitest with React Testing Library verifying RequesterDashboard, StaffDashboard, ActionsTaken list/table, ActionModal drawer, and ticket resolution controls.
4. **Security & Authorization Tests**: Targeted tests verifying server-side boundaries (Requesters cannot POST actions, Requesters cannot access Staff Dashboard, Inactive users rejected).
5. **Migration & Regression Tests**: Verification that Lab 1, 2, and 3 capabilities (auth, ticket creation, attachments, public comments, internal notes, admin user management) continue to function cleanly with zero breaking changes.
6. **End-to-End (E2E) Tests**: Playwright browser tests verifying complete user journeys across Desktop, Tablet, and Mobile viewports.

---

## 2. Planned Tests Table

| Test ID | Type | Requirement / AC | What It Tests / Scenario | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-01** | Unit | BR-05 | Follow-up note validator | Validates follow-up note is required if `isFollowUpRequired = true` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **UT-02** | Unit | BR-12 | Ticket status transition rule matrix | Verifies all 8 statuses and permitted/prohibited state transitions | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **UT-03** | Unit | BR-15, BR-16 | Resolution gate prerequisite rules | Validates `>= 1` Action Taken and non-empty `resolutionSummary` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-01** | API | FR-01, AC-01 | `POST /api/tickets/:id/actions` (Valid data) | `201 Created`, creates record with `performedById = currentUser.id` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-02** | API | BR-05, AC-02 | `POST /api/tickets/:id/actions` (Missing follow-up note) | `400 Bad Request` with `FOLLOW_UP_NOTE_REQUIRED` error code | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-03** | API | FR-01, AC-03 | `POST /api/tickets/:id/actions` with attachment notes | `201 Created`, persists attachment notes string | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04** | API | FR-02, AC-04 | `PATCH /api/actions/:id` (Valid update) | `200 OK`, updates description/result in PostgreSQL | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-05** | API | FR-02, AC-05 | `PATCH /api/actions/:id` (Update follow-up missing note)| `400 Bad Request` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-06** | API | FR-03, AC-06 | `GET /api/tickets/:id/actions` (Requester owned ticket) | `200 OK`, returns all actions taken for that ticket | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-07** | API | FR-03, AC-07 | `POST /api/tickets/:id/actions` (Requester attempt) | `403 Forbidden` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-08** | API | FR-04, AC-08 | Action performer differs from Ticket Owner | `201 Created`, `performedById` is actor, ticket `ownerId` untouched | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-09** | API | FR-05, AC-09 | `PATCH /api/tickets/:id/status` (Permitted: OPEN -> IN_PROGRESS)| `200 OK`, updates status | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-10** | API | FR-05, AC-10 | `PATCH /api/tickets/:id/status` (Invalid: NEW -> CLOSED) | `422 Unprocessable Entity` with `INVALID_STATUS_TRANSITION` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-11** | API | FR-06, AC-11 | Transition to `RESOLVED` with 0 Actions Taken | `422 Unprocessable Entity` (`RESOLUTION_REQUIRES_ACTION_TAKEN`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-12** | API | FR-06, AC-12 | Transition to `RESOLVED` with 1 Action but missing summary| `422 Unprocessable Entity` (`RESOLUTION_SUMMARY_REQUIRED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-13** | API | FR-06, AC-11 | Transition to `RESOLVED` with 1 Action and valid summary | `200 OK`, updates status to `RESOLVED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-14** | API | FR-07, AC-13 | Requester advisory "Problem Appears Resolved" | `200 OK`, posts public comment, does not directly set `RESOLVED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-15** | API | FR-08, AC-14 | `PATCH /api/actions/:id` with stale `expectedUpdatedAt` | `409 Conflict` with `STALE_UPDATE_CONFLICT` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-16** | API | FR-09, AC-15 | `GET /api/dashboard/requester` (Metrics & Recent) | `200 OK`, returns accurate user-scoped counts and recent tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-17** | API | FR-09, AC-16 | `GET /api/dashboard/requester` (Data Isolation) | Never leaks tickets owned by other requesters | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-18** | API | FR-10, AC-17 | `GET /api/dashboard/staff` (Staff Queue Metrics) | `200 OK`, returns accurate operational counts and recent list | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-19** | API | FR-10, AC-17 | `GET /api/dashboard/staff` (Requester access attempt) | `403 Forbidden` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-20** | API | FR-11, AC-19 | `GET /api/dashboard/admin` (Staff Metrics + User counts) | `200 OK`, includes `userSummary` object with active/inactive counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **UI-01** | UI | AC-01, AC-02 | `ActionsTaken` component (list, badges, conditional inputs) | Renders action rows, follow-up flags, and form validation | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-02** | UI | AC-09, AC-11 | `TicketWorkflow` component (transition controls & gate feedback) | Blocks resolve button when 0 actions, renders summary prompt | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-03** | UI | AC-15, AC-21 | `RequesterDashboard` component | Renders metric cards, recent tickets list, empty states | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-04** | UI | AC-17, AC-18 | `StaffDashboard` component | Renders 5 queue cards, drill-down navigation, quick actions | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-08 | Actions Taken End-to-End Workflow | Full journey: Login Staff -> View ticket -> Record action -> Edit action -> Verify timeline | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-02** | E2E | AC-11, AC-13 | Ticket Resolution Gate End-to-End Journey | Full journey: Attempt resolve (blocked) -> Record action -> Resolve -> Close | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **E2E-03** | E2E | AC-15, AC-18 | Role Dashboards & Drill-down Journey | Full journey: Requester views metrics -> Drill-down -> Staff views queue metrics -> Drill-down | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **REG-01** | Regr | AC-20 | Lab 1–3 Full Test Suite Regression | Complete suite of all existing Lab 1, 2, and 3 tests passing 100% | Existing test files | Planned |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Functional Requirements | Business Rules | Automated Test IDs |
| :--- | :--- | :--- | :--- |
| **AC-01** (Create Action Taken) | FR-01 | BR-01, BR-03, BR-04 | `API-01`, `UI-01`, `E2E-01` |
| **AC-02** (Follow-up Validation on Create) | FR-01 | BR-05 | `UT-01`, `API-02`, `UI-01` |
| **AC-03** (Attachment Notes Storage) | FR-01 | BR-06 | `API-03`, `UI-01` |
| **AC-04** (Update Action Taken) | FR-02 | BR-04, BR-11 | `API-04`, `UI-01`, `E2E-01` |
| **AC-05** (Follow-up Validation on Update) | FR-02 | BR-05 | `UT-01`, `API-05`, `UI-01` |
| **AC-06** (Requester Read Actions Owned Ticket)| FR-03 | BR-09 | `API-06`, `UI-01` |
| **AC-07** (Requester Action Creation Blocked) | FR-03 | BR-10 | `API-07`, `UI-01` |
| **AC-08** (Independent Performer vs. Owner) | FR-04 | BR-02 | `API-08`, `E2E-01` |
| **AC-09** (Permitted Status Transitions) | FR-05 | BR-12 | `UT-02`, `API-09`, `UI-02` |
| **AC-10** (Invalid Status Transition Rejection)| FR-05 | BR-12, BR-13 | `UT-02`, `API-10` |
| **AC-11** (Resolution Gate: Action Prerequisite)| FR-06 | BR-15, BR-17 | `UT-03`, `API-11`, `UI-02`, `E2E-02` |
| **AC-12** (Resolution Gate: Summary Prerequisite)| FR-06 | BR-16 | `UT-03`, `API-12`, `UI-02`, `E2E-02` |
| **AC-13** (Requester Advisory Resolution) | FR-07 | BR-18 | `API-14`, `E2E-02` |
| **AC-14** (Optimistic Concurrency Detection) | FR-08 | BR-19 | `API-15`, `UI-01` |
| **AC-15** (Requester Dashboard Metrics) | FR-09 | BR-20, BR-21 | `API-16`, `UI-03`, `E2E-03` |
| **AC-16** (Requester Dashboard Isolation) | FR-09 | BR-20 | `API-17`, `UI-03` |
| **AC-17** (IT Staff Dashboard Metrics) | FR-10 | BR-23, BR-24 | `API-18`, `UI-04`, `E2E-03` |
| **AC-18** (Dashboard Drill-Down Navigation) | FR-10 | BR-23 | `UI-04`, `E2E-03` |
| **AC-19** (Administrator Dashboard Counters) | FR-11 | BR-26 | `API-20` |
| **AC-20** (Full System Regression) | FR-12 | BR-27 | `REG-01` |
| **AC-21** (Empty State Dashboard Rendering) | FR-09, FR-10 | BR-25 | `UI-03`, `UI-04` |
| **AC-22** (Responsive & Accessibility Polish)| FR-12 | BR-28 | `E2E-01`, `E2E-02`, `E2E-03` |
