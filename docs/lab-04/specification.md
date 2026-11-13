# Lab 4 Sprint Engineering Specification — TokTickIT Actions Taken, Dashboards, and Final Regression

## 1. Sprint Goal
Deliver an enterprise-grade service-desk execution and visibility increment for TokTickIT under the Zen Green design language. This sprint models and enforces a parent-child work tracking hierarchy by introducing Actions Taken for Tickets (supporting independent work tracking by multiple IT Staff members under a single Ticket Owner), establishes role-appropriate operational Dashboards for Requesters, IT Staff, and Administrators with authoritative backend metrics and drill-down navigation, completes and hardens the Ticket status lifecycle (enforcing server-side resolution and closure gates), protects against stale/concurrent updates, and hardens the full-stack system across all Lab 1–3 capabilities with zero regressions.

---

## 2. Stakeholder Request Interpretation
The TokTickIT service desk stakeholders have identified the key operational gap: while tickets can be received, assigned, prioritized, and discussed via public comments and internal notes, IT teams lack a structured mechanism to plan, execute, and verify actual technical interventions. Furthermore, Requesters, IT Staff, and Administrators lack dedicated summary views to monitor their operational backlog and workload.

1. **Structured Work Execution (Actions Taken)**:
   * Each Ticket requires a parent-child relationship with zero or more Actions Taken records.
   * Each Action Taken must capture: Action Date/Time (`actionDateTime`), Action Description (`actionDescription`), Result (`result`), Performed By (`performedById`, automatically attributed to the authenticated actor), Follow-Up Required toggle (`isFollowUpRequired`), Follow-up Note (`followUpNote`, mandatory if follow-up is required), and Attachment Notes (`attachmentNotes`, optional reference to physical media/screenshots/logs).
   * **Separation of Ownership vs. Execution**: The primary Ticket Owner (`ownerId`) retains overall responsibility for coordinating the ticket. However, any active IT Staff member or Administrator may perform work and record an Action Taken without transferring primary ticket ownership.
2. **Authoritative Role-Appropriate Dashboards**:
   * Dashboards must summarize authoritative operational data computed on the backend (not bulk client-side filtering) and provide intuitive drill-downs into detailed queues or filtered lists.
   * **Requester Dashboard**: Focuses exclusively on tickets owned by the authenticated Requester (`My Open Tickets`, `In Progress`, `Resolved`, `Closed`, and `Recent Tickets` list).
   * **IT Staff Dashboard**: Focuses on operational throughput and queue triage (`New Tickets`, `Open Tickets`, `In Progress`, `Waiting for Requester`, `My Assigned Tickets`, and `My Recent Tickets` list with quick actions).
   * **Administrator Dashboard**: Reuses the IT Staff operational view with supplementary user-account summary counters (Total Users, Active Users, Inactive Users).
3. **Formal Lifecycle Enforcement (Resolution Gate)**:
   * The status lifecycle is formalized: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
   * The backend is the sole authority for state transitions. A Requester's "Problem Appears Resolved" indication remains purely advisory (posts a comment and notifies staff) and does not bypass IT review.
   * Formal resolution (`RESOLVED`) requires at least one recorded Action Taken and a non-empty `resolutionSummary`. Formal closure (`CLOSED`) is restricted to IT Staff and Administrators.
4. **Data Concurrency & Stale-Update Protection**:
   * Concurrent edits to tickets and actions are detected via optimistic concurrency / timestamp checks (`updatedAt`) to prevent accidental overwrites during multi-user operational triage.
5. **Zen Green UI Polish & Complete Hardening**:
   * Clean responsive behavior across Desktop (≥992px), Tablet (768–991px), and Mobile (<768px), accessible form controls, distinct visual styling, and rigorous regression protection.

---

## 3. Scope

### Included in Lab 4
* **Actions Taken Data Model & REST APIs**:
  * New `ActionTaken` model in PostgreSQL via Prisma with relation to `Ticket` and `User` (performer).
  * CRUD/List endpoints for Actions Taken under `/api/tickets/:id/actions` and `/api/actions/:id`.
  * Automatic performer stamping (`performedById = currentUser.id`), validation for follow-up note when `isFollowUpRequired = true`.
  * Role authorization: IT Staff and Admin can create and update; Requesters can only view Actions Taken on their owned tickets.
* **Formal Ticket Lifecycle & Resolution Gate**:
  * Enforced state transition matrix on the backend for all 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  * Backend resolution gate: Transition to `RESOLVED` requires at least 1 Action Taken on the ticket AND a valid `resolutionSummary` (≥5 chars).
  * Transition to `CLOSED` restricted to IT Staff and Administrator.
  * Advisory Requester "Problem Appears Resolved": Appends a public comment and can set status to `WAITING_FOR_REQUESTER` or flag for review, but cannot directly force `RESOLVED` without IT review.
* **Operational Role Dashboards**:
  * Requester Dashboard API (`GET /api/dashboard/requester`) and UI (`/requester/dashboard`).
  * IT Staff Dashboard API (`GET /api/dashboard/staff`) and UI (`/staff/dashboard`).
  * Admin Dashboard API (`GET /api/dashboard/admin`) and UI (`/admin/dashboard` or embedded extension).
  * Direct drill-down links to filtered queues (e.g., clicking "My Assigned" navigates to `/staff/queue?assigned=ME`).
* **Optimistic Concurrency & Safe Failure**:
  * Conflict detection via `updatedAt` on Ticket status transitions and Action Taken updates, returning `409 Conflict` when stale.
  * Robust client-side error feedback and preservation of form inputs upon recoverable failures.
* **Database Migration & Backfill**:
  * Migration adding `actions_taken` table and required indexes.
  * Legacy ticket compatibility: existing tickets without Actions Taken remain completely valid; legacy tickets in `RESOLVED` or `CLOSED` remain intact.
  * Idempotent seed script enhancements covering zero, single, and multiple Actions Taken, realistic assignee splits, and dashboard test fixtures.
* **Zen Green UI & Full-Stack Hardening**:
  * Actions Taken list/table, create drawer/form, edit modal on Ticket Detail.
  * Responsive verification across Desktop, Tablet, and Mobile viewports with zero horizontal overflow.
  * Complete regression verification for Labs 1, 2, and 3.

### Excluded from Lab 4 (Explicitly Deferred)
* Automatic SLA clocks, breach alarms, countdown timers, and escalation engines.
* External notifications (Email, SMS, LINE, Webhook, push notifications).
* Inventory, spare-parts tracking, billing, timesheet payroll, or labor-cost calculations.
* Multi-level approval workflows, cryptographic signatures, or executive sign-offs.
* Advanced BI report builders, custom query builders, data warehouse exports.
* Multi-tenant organization isolation or multi-department hierarchical routing.

---

## 4. Functional Requirements (FR)

### FR-01: Action Taken Recording & Performer Attribution
* **Statement**: The system shall permit authenticated IT Staff and Administrators to record Actions Taken for any accessible Ticket, automatically recording the action date/time, action description, result summary, authenticated performer ID, follow-up flag, follow-up note, and attachment notes.
* **Related Business Rules**: `BR-01`, `BR-02`, `BR-03`, `BR-04`, `BR-05`, `BR-06`
* **Related Acceptance Criteria**: `AC-01`, `AC-02`, `AC-03`

### FR-02: Action Taken Updating & Validation
* **Statement**: The system shall allow IT Staff and Administrators to update existing Actions Taken records, validating that if follow-up is required, a non-empty follow-up note is supplied.
* **Related Business Rules**: `BR-04`, `BR-05`, `BR-07`, `BR-08`
* **Related Acceptance Criteria**: `AC-04`, `AC-05`

### FR-03: Action Taken Visibility & Role Boundaries
* **Statement**: The system shall allow Requesters to view Actions Taken on their owned tickets while strictly prohibiting Requesters from creating, modifying, or deleting Actions Taken (returning HTTP 403 Forbidden).
* **Related Business Rules**: `BR-09`, `BR-10`
* **Related Acceptance Criteria**: `AC-06`, `AC-07`

### FR-04: Separation of Ticket Ownership vs. Performer
* **Statement**: The system shall allow any active IT Staff member or Administrator to record Actions Taken on a ticket regardless of who is assigned as the primary Ticket Owner (`ownerId`), preserving the primary owner's assignment.
* **Related Business Rules**: `BR-02`, `BR-11`
* **Related Acceptance Criteria**: `AC-08`

### FR-05: Enforced Ticket Status Lifecycle & Transition Matrix
* **Statement**: The system shall enforce permitted ticket state transitions across `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`, rejecting non-permitted transitions with HTTP 422 Unprocessable Entity.
* **Related Business Rules**: `BR-12`, `BR-13`, `BR-14`
* **Related Acceptance Criteria**: `AC-09`, `AC-10`

### FR-06: Resolution Gate Enforcement
* **Statement**: The system shall reject any request to transition a ticket to `RESOLVED` unless the ticket has at least one associated Action Taken record AND a valid `resolutionSummary` (minimum 5 characters).
* **Related Business Rules**: `BR-15`, `BR-16`, `BR-17`
* **Related Acceptance Criteria**: `AC-11`, `AC-12`

### FR-07: Advisory Requester Resolution Indication
* **Statement**: When a Requester indicates "Problem Appears Resolved", the system shall record an advisory public comment and update the ticket status only to a reviewable state, preventing Requesters from directly setting the ticket to `RESOLVED` or bypassing IT review.
* **Related Business Rules**: `BR-18`
* **Related Acceptance Criteria**: `AC-13`

### FR-08: Stale-Update & Optimistic Concurrency Detection
* **Statement**: The system shall verify the client-provided `updatedAt` timestamp against the current database record during ticket workflow and action updates, rejecting stale modifications with HTTP 409 Conflict.
* **Related Business Rules**: `BR-19`
* **Related Acceptance Criteria**: `AC-14`

### FR-09: Requester Operational Dashboard
* **Statement**: The system shall provide an authenticated Requester dashboard summarizing the Requester's operational metrics (`totalOpen`, `inProgress`, `resolved`, `closed`), a list of recently updated tickets, and direct drill-downs to the Requester's ticket list.
* **Related Business Rules**: `BR-20`, `BR-21`, `BR-22`
* **Related Acceptance Criteria**: `AC-15`, `AC-16`

### FR-10: IT Staff Operational Dashboard
* **Statement**: The system shall provide IT Staff and Administrators with an operational dashboard summarizing queue metrics (`newTickets`, `openTickets`, `inProgressTickets`, `waitingForRequesterTickets`, `myAssignedTickets`), recent ticket activity, and quick-action navigation to filtered queues.
* **Related Business Rules**: `BR-23`, `BR-24`, `BR-25`
* **Related Acceptance Criteria**: `AC-17`, `AC-18`

### FR-11: Administrator Operational Dashboard & User Summary
* **Statement**: The system shall provide Administrators with the IT Staff operational metrics supplemented with active and total user-account summary metrics (`totalUsers`, `activeUsers`, `inactiveUsers`).
* **Related Business Rules**: `BR-26`
* **Related Acceptance Criteria**: `AC-19`

### FR-12: Full System Regression & Accessibility Hardening
* **Statement**: The system shall preserve all Lab 1, 2, and 3 capabilities (authentication, ticket creation, attachments, public comments, internal notes, admin user management) without regression, compliant with Zen Green accessibility and responsive standards across all viewports.
* **Related Business Rules**: `BR-27`, `BR-28`
* **Related Acceptance Criteria**: `AC-20`, `AC-21`, `AC-22`

---

## 5. Numbered Business Rules (BR)

### Actions Taken Rules
* **BR-01 (Parent-Child Belonging)**: An Action Taken record must belong to exactly one Ticket (`ticketId` is required and immutable). Deletion of a ticket cascades to its actions taken.
* **BR-02 (Ownership Independence)**: The primary Ticket Owner (`ownerId`) coordinates the overall ticket. An Action Taken may be executed and recorded by any active IT Staff or Administrator (`performedById`), which does NOT change or overwrite the Ticket's `ownerId`.
* **BR-03 (Automatic Performer Binding)**: The `performedById` field is automatically set by the server from `currentUser.id`. Client attempts to spoof or specify another performer upon creation are ignored/rejected.
* **BR-04 (Mandatory Action Description & Result)**: `actionDescription` (min 5, max 1000 characters) and `result` (min 2, max 1000 characters) are required non-empty text fields.
* **BR-05 (Conditional Follow-Up Rule)**: If `isFollowUpRequired` is `true`, `followUpNote` is mandatory (min 3, max 1000 characters). If `isFollowUpRequired` is `false`, `followUpNote` must be null or empty.
* **BR-06 (Attachment Notes)**: `attachmentNotes` is an optional descriptive text field (max 500 characters) documenting external file references or physical diagnostic media.
* **BR-07 (Action Date/Time Validity)**: `actionDateTime` defaults to the current timestamp (`now()`) but may be set to an earlier timestamp representing when physical work took place. It cannot be set to a future timestamp greater than 5 minutes ahead of server time.
* **BR-08 (Performer Activation)**: Actions Taken can only be created or modified by active users (`isActive = true`). If an IT Staff user is deactivated, their past recorded Actions Taken remain preserved for audit integrity.
* **BR-09 (Requester Read-Only Visibility)**: Requesters can view Actions Taken for tickets they own (`requesterId == currentUser.id`). Requesters cannot view Actions Taken for tickets owned by other users.
* **BR-10 (Requester Write Prohibition)**: Requesters cannot create, update, or delete Actions Taken. Any such attempt returns HTTP 403 Forbidden.
* **BR-11 (Action Immutability Safeguards)**: Actions Taken records cannot be hard deleted. Edits are tracked with `updatedAt` and preserve audit integrity.

### Ticket Status & Resolution Gate Rules
* **BR-12 (Permitted Status Transitions Matrix)**:
  * `NEW` → `OPEN` (IT Staff claims or opens ticket)
  * `NEW` → `CANCELLED` (IT Staff/Admin cancels invalid ticket)
  * `OPEN` → `IN_PROGRESS` (IT Staff begins work)
  * `OPEN` → `CANCELLED` (IT Staff/Admin cancels ticket)
  * `IN_PROGRESS` → `WAITING_FOR_REQUESTER` (IT Staff requests user clarification/action)
  * `IN_PROGRESS` → `RESOLVED` (IT Staff/Admin resolves ticket — gate enforced)
  * `IN_PROGRESS` → `CANCELLED` (IT Staff/Admin cancels ticket)
  * `WAITING_FOR_REQUESTER` → `IN_PROGRESS` (Requester or IT Staff resumes work)
  * `WAITING_FOR_REQUESTER` → `RESOLVED` (IT Staff/Admin resolves ticket — gate enforced)
  * `RESOLVED` → `CLOSED` (IT Staff/Admin formally closes ticket)
  * `RESOLVED` → `REOPENED` (Requester or IT Staff indicates issue persists)
  * `REOPENED` → `IN_PROGRESS` (IT Staff resumes work)
  * `REOPENED` → `CANCELLED` (IT Staff/Admin cancels ticket)
  * Any transition not listed above is invalid and must return HTTP 422 Unprocessable Entity.
* **BR-13 (Closed Ticket Terminal State)**: Once a ticket is `CLOSED`, its status cannot be changed to any other state. Further comments, notes, or actions taken on closed tickets are rejected.
* **BR-14 (Cancelled Ticket State)**: A `CANCELLED` ticket cannot transition to active working states except through an explicit reopen to `REOPENED` by an Administrator.
* **BR-15 (Resolution Gate: Action Taken Prerequisite)**: Transitioning any ticket to `RESOLVED` requires that the ticket contains at least one (`>= 1`) Action Taken record. Attempting to resolve a ticket with 0 Actions Taken returns HTTP 422 Unprocessable Entity with error code `RESOLUTION_REQUIRES_ACTION_TAKEN`.
* **BR-16 (Resolution Gate: Summary Prerequisite)**: Transitioning any ticket to `RESOLVED` requires a non-empty `resolutionSummary` string of at least 5 characters.
* **BR-17 (Authorized Roles for Resolution)**: Only users with role `IT_STAFF` or `ADMINISTRATOR` are authorized to transition a ticket to `RESOLVED` or `CLOSED`.
* **BR-18 (Advisory Requester Action)**: When a Requester submits "Problem Appears Resolved", the system appends a public comment and flags the ticket for review, but does NOT set the ticket status directly to `RESOLVED`. An IT Staff member must review the work and formally execute the resolution.

### Concurrency & Conflict Rules
* **BR-19 (Optimistic Concurrency Protection)**: Updates to Ticket status and Action Taken records must submit the expected `updatedAt` timestamp. If the record in the database has a newer `updatedAt` than the client payload, the server rejects the update with HTTP 409 Conflict and error code `STALE_UPDATE_CONFLICT`.

### Dashboard Calculation & Query Rules
* **BR-20 (Requester Dashboard Data Isolation)**: Requester dashboard calculations are strictly scoped to `requesterId == currentUser.id`.
* **BR-21 (Requester Dashboard Metric Formulas)**:
  * `totalOpen`: Count of owned tickets with status in (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
  * `inProgress`: Count of owned tickets with status `IN_PROGRESS`.
  * `resolved`: Count of owned tickets with status `RESOLVED`.
  * `closed`: Count of owned tickets with status `CLOSED`.
* **BR-22 (Requester Recent Tickets List)**: The Requester dashboard returns up to 5 most recently updated tickets owned by the Requester, ordered by `updatedAt DESC`.
* **BR-23 (IT Staff Dashboard Metric Formulas)**:
  * `newTickets`: Total system tickets with status `NEW`.
  * `openTickets`: Total system tickets with status `OPEN`.
  * `inProgressTickets`: Total system tickets with status `IN_PROGRESS`.
  * `waitingForRequesterTickets`: Total system tickets with status `WAITING_FOR_REQUESTER`.
  * `myAssignedTickets`: Tickets assigned to the current user (`ownerId == currentUser.id`) in an active state (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
* **BR-24 (IT Staff Recent Tickets List)**: Returns up to 5 most recently updated active tickets assigned to the current user or unassigned, ordered by `updatedAt DESC`.
* **BR-25 (Dashboard Empty State & Zero Values)**: If no tickets match a metric query, the backend returns an authoritative count of `0`. The UI renders cards with value `0` and empty list placeholders rather than hiding components or breaking layout.
* **BR-26 (Administrator Metrics)**: In addition to the IT Staff metrics, the Administrator dashboard returns `totalUsers`, `activeUsers`, and `inactiveUsers`.
* **BR-27 (Backend Authority)**: All dashboard metrics must be computed authoritative counts via Prisma database aggregation queries. Clients must not fetch all tickets to calculate counts locally.
* **BR-28 (Timezone & Date Standard)**: All timestamps are stored in UTC ISO-8601 format and rendered in client local time.

---

## 6. UI Specification Summary
*(For detailed wireframes, responsive breakpoints, visual tokens, and state flow diagrams, see [docs/lab-04/ui-spec.md](file:///c:/Users/UsEr/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-04/ui-spec.md))*

* **Design Language**: Zen Green design system with primary `#006B3C`, secondary `#0B7A46`, pale green `#EAF6EF`, canvas `#F5F7F6`, and amber `#FFF8E1`.
* **Role-Based Navigation**:
  * Requesters: Dashboard (`/requester/dashboard`), My Tickets (`/tickets`), Create Ticket (`/tickets/new`).
  * IT Staff: Dashboard (`/staff/dashboard`), Ticket Queue (`/staff/queue`).
  * Admin: Dashboard (`/admin/dashboard`), Ticket Queue (`/staff/queue`), User Management (`/admin/users`).
* **Actions Taken UI on Ticket Detail**:
  * Positioned below Ticket description alongside Public Comments and Internal Notes.
  * Desktop/Tablet: Responsive table showing Action Date/Time, Description, Result, Performed By badge, Follow-up indicator, Attachment Notes, and Edit button (for IT Staff/Admin).
  * Mobile: Stacked card view with high-contrast text and clear touch targets.
  * Create/Edit Action Taken Modal/Drawer: Form inputs for date/time (defaults to now), description (textarea), result (textarea), follow-up required (checkbox), follow-up note (conditional textarea, visible/required only when checked), and attachment notes.
* **Dashboard Metric Cards & Drill-Down**:
  * Clean grid cards displaying metric title, bold numeric count, trend/status icon, and an accessible clickable target navigating directly to the filtered queue or ticket list.
* **Stale Update Notification**:
  * Banner notification displayed upon receiving HTTP 409 Conflict, offering a single-click "Refresh latest data" action that preserves user intent without crashing.

---

## 7. Data Changes & Migration Strategy

### 7.1. Database Model Evolution (`server/prisma/schema.prisma`)
The PostgreSQL schema evolves by adding the `ActionTaken` model and relations to `Ticket` and `User`.

```prisma
model ActionTaken {
  id                  Int       @id @default(autoincrement())
  ticketId            Int
  performedById       Int
  actionDateTime      DateTime  @default(now())
  actionDescription   String    @db.Text
  result              String    @db.Text
  isFollowUpRequired  Boolean   @default(false)
  followUpNote        String?   @db.Text
  attachmentNotes     String?   @db.VarChar(500)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  ticket              Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedBy         User      @relation("ActionPerformer", fields: [performedById], references: [id], onDelete: Restrict)

  @@index([ticketId, actionDateTime(sort: Desc)])
  @@index([performedById])
  @@map("actions_taken")
}
```

#### Ticket Model Updates:
* Relation added: `actionsTaken ActionTaken[]`
* Index added: `@@index([status, ownerId])` for fast dashboard aggregations.

#### User Model Updates:
* Relation added: `actionsPerformed ActionTaken[] @relation("ActionPerformer")`

### 7.2. Database Design Justifications (Minimum Two)
1. **Dedicated Child Table for Work Execution (`actions_taken`)**:
   * *Decision*: Model Actions Taken as a distinct relational child table rather than embedding a JSON array in the `Ticket` table.
   * *Justification*: IT service desk audits require relational integrity, foreign key enforcement to the active performer (`User.id`), indexed chronological queries, and concurrent updates by multiple technicians without locking the entire ticket row.
2. **Normalized Foreign Key for Performer vs. Free-Text Author**:
   * *Decision*: Use `performedById` referencing `User(id)` with `onDelete: Restrict` instead of a simple free-text string.
   * *Justification*: Prevents tampering or impersonation by binding execution to the authenticated session user, enables queries for "Actions performed by technician X across all tickets", and prevents deletion of user records that have active audit history.
3. **Compound Indexes for Dashboard Operational Performance**:
   * *Decision*: Create compound index `@@index([ticketId, actionDateTime(sort: Desc)])` and `@@index([status, ownerId])`.
   * *Justification*: Dashboards execute frequent `COUNT` aggregations grouped by status and ownership, and ticket views fetch chronological actions. Indexed scans eliminate sequential table scans as ticket volume scales.

### 7.3. Migration, Backfill, and Legacy Compatibility
* **Migration Script**: `prisma migrate dev --name add_actions_taken_model`.
* **Zero Discard Policy**: All existing Users, Categories, Related Systems, Tickets, Attachments, Public Comments, and Internal Notes remain completely intact.
* **Legacy Tickets Backfill Policy**: Existing historical tickets from Labs 1–3 have zero Actions Taken. They remain readable, searchable, and manageable. The resolution gate applies only to future status transitions to `RESOLVED`. Existing `RESOLVED` and `CLOSED` tickets remain in their status.
* **Rollback Plan**: Rollback consists of `prisma migrate resolve` and dropping the `actions_taken` table without data loss to parent tables.

### 7.4. Idempotent Seed Data (`server/prisma/seed.ts`)
* Seeding ensures reproducible test environments:
  * Creates realistic sample Tickets with:
    * 0 Actions Taken (demonstrating empty states and resolution gate blocking).
    * 1 Action Taken (demonstrating resolution prerequisite fulfillment).
    * Multiple Actions Taken by different technicians under one ticket owner.
  * Seeds tickets across all 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  * Provides fixture data demonstrating non-zero and zero dashboard metrics for all roles.

---

## 8. REST API Contract Summary
*(For complete schemas, request/response payloads, and error codes, see [docs/lab-04/api-spec.md](file:///c:/Users/UsEr/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-04/api-spec.md))*

| Endpoint Path | Method | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/tickets/:id/actions` | `GET` | All Roles (Owner check) | Lists Actions Taken for a ticket, sorted by `actionDateTime DESC`. |
| `/api/tickets/:id/actions` | `POST` | `IT_STAFF`, `ADMINISTRATOR` | Creates a new Action Taken record. Sets `performedById` from session. |
| `/api/actions/:id` | `PATCH` | `IT_STAFF`, `ADMINISTRATOR` | Updates an existing Action Taken record with concurrency check. |
| `/api/dashboard/requester` | `GET` | `REQUESTER` | Returns authenticated Requester metric counters and recent tickets. |
| `/api/dashboard/staff` | `GET` | `IT_STAFF`, `ADMINISTRATOR` | Returns operational queue metric counters and recent tickets. |
| `/api/dashboard/admin` | `GET` | `ADMINISTRATOR` | Returns IT Staff metrics + user management counters. |
| `/api/tickets/:id/status` | `PATCH` | `IT_STAFF`, `ADMINISTRATOR` | Enforces state transition matrix and resolution gate prerequisites. |

---

## 9. Acceptance Criteria (AC)

* **AC-01 (Create Action Taken)**: Given an authenticated IT Staff or Administrator user and valid input, when submitting `POST /api/tickets/:id/actions`, then the Action Taken is created with `performedById` bound to the authenticated user, and HTTP 201 Created is returned.
* **AC-02 (Follow-up Validation on Action Creation)**: Given an IT Staff user submitting an Action Taken with `isFollowUpRequired = true` but an empty `followUpNote`, then the API rejects the request with HTTP 400 Bad Request and an explicit validation error.
* **AC-03 (Attachment Notes Storage)**: Given an IT Staff user creating an Action Taken with descriptive attachment notes (e.g., "See physical memory dump on server rack 4"), then the notes are persisted and returned in the action payload.
* **AC-04 (Update Action Taken)**: Given an IT Staff or Administrator user and an existing Action Taken, when submitting valid updates to `PATCH /api/actions/:id`, then the record is updated in PostgreSQL and HTTP 200 OK is returned.
* **AC-05 (Follow-up Validation on Action Update)**: Given an update setting `isFollowUpRequired = true` with missing or blank `followUpNote`, the update is rejected with HTTP 400 Bad Request.
* **AC-06 (Requester Read Actions on Owned Ticket)**: Given an authenticated Requester viewing an owned ticket, when fetching Actions Taken, then all recorded Actions Taken for that ticket are returned.
* **AC-07 (Requester Action Creation Forbidden)**: Given an authenticated Requester attempting to call `POST /api/tickets/:id/actions` or `PATCH /api/actions/:id`, then the API returns HTTP 403 Forbidden.
* **AC-08 (Independent Action Performer vs. Ticket Owner)**: Given Ticket A owned by Tech 1, when Tech 2 records an Action Taken, then the action is created with `performedById = Tech 2` while the ticket's `ownerId` remains Tech 1.
* **AC-09 (Permitted Status Transitions)**: Given an IT Staff user and a ticket in `OPEN`, when transitioning status to `IN_PROGRESS`, then the status update succeeds with HTTP 200 OK.
* **AC-10 (Invalid Status Transition Rejection)**: Given a ticket in `NEW`, when attempting a direct transition to `CLOSED` or `RESOLVED`, then the API rejects the transition with HTTP 422 Unprocessable Entity.
* **AC-11 (Resolution Gate - Actions Taken Prerequisite)**: Given an `IN_PROGRESS` ticket with 0 Actions Taken, when an IT Staff member attempts to transition the status to `RESOLVED`, then the API rejects the transition with HTTP 422 Unprocessable Entity (`RESOLUTION_REQUIRES_ACTION_TAKEN`).
* **AC-12 (Resolution Gate - Summary Prerequisite)**: Given an `IN_PROGRESS` ticket with 1 Action Taken but an empty or <5 char `resolutionSummary`, when attempting to transition to `RESOLVED`, then the API rejects the transition with HTTP 422 Unprocessable Entity.
* **AC-13 (Requester Advisory Resolution)**: Given an authenticated Requester indicating "Problem Appears Resolved", the system records a public comment and does not directly transition the ticket to `RESOLVED`.
* **AC-14 (Optimistic Concurrency Conflict Detection)**: Given a client submitting an update with a stale `updatedAt` timestamp, then the server rejects the update with HTTP 409 Conflict.
* **AC-15 (Requester Dashboard Metrics)**: Given an authenticated Requester, when calling `GET /api/dashboard/requester`, then the response returns accurate counts for `totalOpen`, `inProgress`, `resolved`, `closed`, and up to 5 recent tickets strictly owned by that Requester.
* **AC-16 (Requester Dashboard Isolation)**: Given Requester A, when fetching the Requester dashboard, tickets owned by Requester B are never included in metric counts or recent lists.
* **AC-17 (IT Staff Dashboard Metrics)**: Given an authenticated IT Staff member, when calling `GET /api/dashboard/staff`, then accurate counts for `newTickets`, `openTickets`, `inProgressTickets`, `waitingForRequesterTickets`, `myAssignedTickets`, and recent active tickets are returned.
* **AC-18 (Dashboard Drill-Down Navigation)**: Given the IT Staff Dashboard, clicking the "My Assigned" metric card navigates to `/staff/queue?assigned=ME` with the queue pre-filtered.
* **AC-19 (Administrator Dashboard Account Counters)**: Given an Administrator fetching the dashboard, the response includes IT Staff queue metrics along with `totalUsers`, `activeUsers`, and `inactiveUsers`.
* **AC-20 (Full System Regression)**: All Lab 1, 2, and 3 capabilities (login, password change, ticket creation, attachment upload/download/soft-remove, public comments, internal notes, admin user management) continue to function without errors.
* **AC-21 (Empty State Dashboard Rendering)**: When an authenticated user has zero tickets matching a dashboard metric, the dashboard displays `0` and a calm empty-state placeholder rather than an error or broken layout.
* **AC-22 (Responsive & Accessibility Polish)**: All Lab 4 screens (Dashboards, Actions Taken list/form, Ticket Detail) pass responsive checks across Desktop (1200px), Tablet (768px), and Mobile (375px) with zero horizontal overflow, visible focus indicators, and semantic HTML markup.

---

## 10. Product Definition of Done (DoD)

- [ ] **Specifications Complete & Aligned**: `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` are documented, peer-reviewed, and consistent.
- [ ] **Database & Migrations**: Prisma schema evolved with `ActionTaken` model, relations, and indexes; migration runs cleanly; seed script populates tickets with 0, 1, and multiple actions taken, realistic performer splits, and dashboard test fixtures.
- [ ] **Server-Side Authorization**: Every endpoint verifies session identity, role boundaries (`Requester` vs. `IT_STAFF` vs. `ADMINISTRATOR`), and ticket ownership.
- [ ] **Actions Taken Feature**: Full backend CRUD/list and frontend list, card, create modal, and edit modal operational.
- [ ] **Ticket Status Lifecycle & Resolution Gate**: Status machine enforced; transitions to `RESOLVED` strictly require `>= 1` Action Taken and non-empty `resolutionSummary`; transitions to `CLOSED` restricted to staff/admin.
- [ ] **Authoritative Dashboards**: Requester, IT Staff, and Admin dashboards operational with server-computed metrics, empty states, and clickable drill-down filters.
- [ ] **Concurrency & Conflict Handling**: `updatedAt` stale-update detection implemented on ticket workflow and action updates with HTTP 409 safe failure handling.
- [ ] **Zen Green Design & Responsiveness**: Verified across Desktop (≥992px), Tablet (768–991px), and Mobile (<768px) with zero layout overflow.
- [ ] **Automated Test Coverage**: 100% of planned tests pass across Unit, API/Integration, UI Component, and Playwright E2E suites with zero regressions.

---

## 11. Assumptions and Decisions

1. **Resolution Gate Enforcement Level**: The resolution prerequisite (`>= 1` Action Taken) is strictly enforced in the backend service layer for all transitions to `RESOLVED`, guaranteeing that API bypass or script invocation cannot circumvent the requirement.
2. **Requester Resolution Semantics**: In alignment with stakeholder requirements, Requesters cannot formally resolve tickets. When a Requester indicates the problem appears resolved, it is treated as advisory feedback (recording a public comment and flagging the ticket for staff closure).
3. **Optimistic Concurrency Strategy**: Optimistic concurrency uses the record's ISO-8601 `updatedAt` timestamp passed in the request body. If the timestamp does not match the database state within a 1-second resolution window, HTTP 409 Conflict is returned.
4. **Dashboard Aggregation Strategy**: All metrics are calculated via single-roundtrip Prisma aggregation queries (`prisma.ticket.groupBy` and `prisma.ticket.count`) rather than in-memory client filtering, ensuring sub-100ms dashboard latency.
