# Lab 3 Sprint Engineering Specification — TokTickIT Users, Roles, IT Ticketing, and Admin Screens

## 1. Sprint Goal
Deliver a secure, role-authenticated IT service desk platform for TokTickIT using the Zen Green design language. This increment replaces the temporary Development Requester selector with secure bcrypt-authenticated login, session management, and mandatory first-login password changes. It introduces operational IT Staff workflows—including a searchable/filterable shared Ticket Queue, ticket ownership assignment, IT Priority management, status transitions, Public Comments, and private Internal Notes—and a minimalist Administrator User Management console with single-role assignment, account activation toggling, and initial password resets, while preserving all existing Lab 2 Requester functions and backend ownership protections.

---

## 2. Stakeholder Request Interpretation
The IT Service Desk leadership and system administration teams require an operational multi-role support ecosystem replacing the Lab 2 development placeholder with real identity and access management:
1. **Authentication & Identity Security**:
   * All users authenticate with email and password. Passwords must be hashed with bcrypt; plaintext storage is strictly prohibited.
   * Users provisioned with an initial password (or reset by an Administrator) must immediately change their password upon first login before accessing normal application screens.
   * Session state must be established securely via HTTP-only session cookies / authenticated tokens and destroyed upon logout.
2. **Role-Based Navigation & Server-Side Authorization**:
   * The platform supports three distinct roles: `Requester`, `IT_STAFF`, and `ADMINISTRATOR`. Each user has exactly one role.
   * Every REST endpoint and screen action must be enforced on the backend. Hiding or disabling frontend UI controls is considered UX guidance, not a security control.
3. **Requester Continuous Workflow & Ownership**:
   * Requesters submit and track tickets bound strictly to their authenticated identity.
   * Requesters can post Public Comments on their tickets and click "Problem Appears Resolved" to signal resolution, but cannot formally set a ticket status to `RESOLVED` or `CLOSED`.
   * Requesters are strictly forbidden from viewing or writing Internal Notes.
4. **IT Staff Operational Queue & Ticket Management**:
   * IT Staff access a shared Ticket Queue equipped with text search (ticket number/summary), multi-field filtering (category, requested priority, IT priority, status, ownership), sorting, and pagination.
   * IT Staff can claim unassigned tickets, reassign tickets to other IT Staff/Admin, set IT Priority, execute permitted status transitions, post Public Comments, and write private Internal Notes.
5. **Administrator User Management**:
   * Administrators manage user accounts via a dedicated, minimalist screen featuring text search (name/email) and role filtering.
   * Administrators can create user accounts with one role and an initial password, edit basic profile information and role, toggle account activation state (`isActive`), and set new initial passwords.
   * Safety guardrails must prevent self-deactivation by an Administrator and prevent deactivating or removing the system's last active Administrator. User deletion is prohibited.
6. **Zen Green Aesthetics & Component Continuity**:
   * All new screens must strictly adhere to the Zen Green design system (color tokens, typography, readable form layouts, loading/empty states, visual separation of Public Comments vs Internal Notes).

---

## 3. Scope

### Included in Lab 3
* **Authentication & Session Management**:
  * `User` database model with bcrypt password hashing (`passwordHash`), role, activation state, and `mustChangePassword` flag.
  * Login (`POST /api/auth/login`), Logout (`POST /api/auth/logout`), and Current User (`GET /api/auth/me`) APIs.
  * Mandatory First-Login Password Change screen and endpoint (`POST /api/auth/change-password`).
  * Inactive account login rejection with safe failure feedback.
* **Migration & Requester Ownership**:
  * Seamless database migration evolving Lab 2 `RequesterUser` records into the unified `User` model without breaking existing tickets or attachments.
  * Complete removal of Development Requester selector UI and client-side header switcher.
  * Backend enforcement using authenticated user context instead of `X-Requester-Id`.
* **IT Staff Workflow & Shared Ticket Queue**:
  * Shared Ticket Queue screen (`/staff/queue`) with desktop table and mobile card view.
  * Query parameters for search, category, priority, status, assignment filter, sorting, and pagination.
  * IT Ticket Detail screen (`/staff/tickets/:id`) with read-only vs editable fields, Claim/Reassign controls, IT Priority picker, and Status transition buttons.
* **Collaboration (Public Comments & Internal Notes)**:
  * Public Comments timeline visible to Requester owner, IT Staff, and Administrators.
  * Internal Notes timeline visible strictly to IT Staff and Administrators (HTTP 403 Forbidden for Requesters).
  * Backend author and timestamp recording for all comments and notes.
* **Minimalist Administrator User Management**:
  * User list screen (`/admin/users`) with search, role filtering, and pagination.
  * Create User modal/drawer (Name, Email, Role, Active state, Initial Password).
  * Edit User modal/drawer (Name, Email, Role, Active state).
  * Set Initial Password modal (`mustChangePassword = true`).
  * Safety rules preventing self-deactivation and last-admin deactivation.
* **Zen Green UI & Accessibility**:
  * Updated navigation header with user profile badge, role indicator, and Logout action.
  * Distinct styling for Public Comments (pale green tint) versus Internal Notes (amber/dark tint).

### Excluded from Lab 3 (Explicitly Deferred)
* Email delivery of passwords or reset links (initial passwords communicated out-of-band).
* Self-registration, email confirmation, MFA, social login, or SSO.
* Actions Taken timeline and resolution prerequisites (deferred to Lab 4).
* User account deletion, bulk operations, user import/export, profile photos, or department structures.
* Multiple roles per user or multi-tenant organizational hierarchy.
* Formal SLA calculations, automated escalation rules, or external notification services.

---

## 4. Functional Requirements (FR)

### FR-01: Authentication & Credential Verification
* **Statement**: The system shall authenticate users via email and password, verifying credentials against bcrypt-hashed passwords in the `User` database table.
* **Related Business Rules**: `BR-01`, `BR-02`, `BR-03`
* **Related Acceptance Criteria**: `AC-01`, `AC-02`

### FR-02: Mandatory Password Change Enforcement
* **Statement**: The system shall intercept any authenticated user whose `mustChangePassword` flag is `true` and restrict navigation strictly to the Change Password screen until a new valid password is saved.
* **Related Business Rules**: `BR-04`, `BR-05`
* **Related Acceptance Criteria**: `AC-03`, `AC-04`

### FR-03: Session Termination (Logout)
* **Statement**: The system shall invalidate the active authentication session and clear client-side session tokens/cookies upon receiving a logout request.
* **Related Business Rules**: `BR-06`
* **Related Acceptance Criteria**: `AC-05`

### FR-04: Authenticated Requester Ticket Management
* **Statement**: The system shall bind all ticket creations, retrievals, attachment uploads, and attachment soft-removals to the authenticated Requester identity derived from the server session.
* **Related Business Rules**: `BR-07`, `BR-08`, `BR-09`
* **Related Acceptance Criteria**: `AC-06`, `AC-07`

### FR-05: IT Staff Shared Ticket Queue Retrieval
* **Statement**: The system shall provide IT Staff and Administrators with a paginated list of all system tickets, supporting text search, multi-field filtering, sorting, and page navigation.
* **Related Business Rules**: `BR-10`, `BR-11`
* **Related Acceptance Criteria**: `AC-08`, `AC-09`

### FR-06: Ticket Ownership Claim and Reassignment
* **Statement**: The system shall allow IT Staff and Administrators to claim unassigned tickets or reassign ticket ownership to any active IT Staff or Administrator user.
* **Related Business Rules**: `BR-12`
* **Related Acceptance Criteria**: `AC-10`

### FR-07: IT Priority Management
* **Statement**: The system shall allow IT Staff and Administrators to set or update the ticket's `itPriority` field (LOW, MEDIUM, HIGH, URGENT).
* **Related Business Rules**: `BR-13`
* **Related Acceptance Criteria**: `AC-11`

### FR-08: Controlled Ticket Status Transitions
* **Statement**: The system shall enforce ticket status state transitions based on user role, allowing IT Staff/Admin to execute permitted transitions and permitting Requesters to signal "Problem Appears Resolved".
* **Related Business Rules**: `BR-14`, `BR-15`
* **Related Acceptance Criteria**: `AC-12`, `AC-13`

### FR-09: Public Comments Timeline
* **Statement**: The system shall allow Requesters (for owned tickets), IT Staff, and Administrators to view and post append-only Public Comments on a ticket.
* **Related Business Rules**: `BR-16`, `BR-17`
* **Related Acceptance Criteria**: `AC-14`, `AC-15`

### FR-10: Restricted Internal Notes Timeline
* **Statement**: The system shall allow IT Staff and Administrators to view and create private, append-only Internal Notes on a ticket, while rejecting any Requester attempt to access or create Internal Notes with HTTP 403 Forbidden.
* **Related Business Rules**: `BR-18`, `BR-19`
* **Related Acceptance Criteria**: `AC-16`, `AC-17`

### FR-11: Administrator User Listing & Search
* **Statement**: The system shall provide Administrators with a searchable, role-filterable list of all user accounts showing Name, Email, Role, Activation Status, and action buttons.
* **Related Business Rules**: `BR-20`
* **Related Acceptance Criteria**: `AC-18`

### FR-12: User Creation by Administrator
* **Statement**: The system shall allow Administrators to create new user accounts with Name, Email, exactly one Role, Activation State, and an initial password (flagging `mustChangePassword = true`).
* **Related Business Rules**: `BR-21`, `BR-22`
* **Related Acceptance Criteria**: `AC-19`

### FR-13: User Profile Editing & Activation Toggling
* **Statement**: The system shall allow Administrators to update a user's Name, Email, Role, and `isActive` status.
* **Related Business Rules**: `BR-23`, `BR-24`, `BR-25`
* **Related Acceptance Criteria**: `AC-20`, `AC-21`, `AC-22`

### FR-14: Initial Password Reset by Administrator
* **Statement**: The system shall allow Administrators to assign a new initial password to any user account, resetting their `mustChangePassword` flag to `true`.
* **Related Business Rules**: `BR-22`
* **Related Acceptance Criteria**: `AC-23`

---

## 5. Business Rules (BR)

* **BR-01 (Active User Credential Check)**: Only active user accounts (`isActive = true`) with valid email and matching bcrypt password hash may authenticate successfully.
* **BR-02 (Inactive User Account Failure)**: Authentication requests for inactive accounts (`isActive = false`) must be rejected with HTTP 401 Unauthorized using a clear error message ("Account is inactive. Please contact an Administrator") without leaking password validity.
* **BR-03 (Plaintext Password Prohibition)**: Passwords must never be stored, logged, or returned in API responses in plaintext. All passwords must be hashed using bcrypt (salt factor >= 10).
* **BR-04 (Mandatory First-Login Password Change)**: A user marked with `mustChangePassword = true` cannot access normal application endpoints or screens until a valid new password is saved.
* **BR-05 (Password Policy Enforcement)**: New passwords must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character. New password and confirmation must match exactly.
* **BR-06 (Session Invalidation on Logout)**: Logout invalidates the active session identifier on the server and clears the HTTP-only auth cookie.
* **BR-07 (Server-Side Requester Context)**: The authenticated session user identity—never a client-supplied `requesterId` query parameter or body property—determines ownership for Requester operations.
* **BR-08 (Requester Data Isolation)**: Requesters may only view, query, update, and manage tickets and attachments that they submitted (`requesterId == currentUser.id`). Attempting to access another user's ticket returns HTTP 403 Forbidden or 404 Not Found.
* **BR-09 (Requester Status Restriction)**: Requesters cannot directly set ticket status to `RESOLVED` or `CLOSED`. Requesters may only submit tickets (status `NEW`), reply to info requests (status `IN_PROGRESS`), or indicate "Problem Appears Resolved" (which triggers status transition to `RESOLVED` with mandatory comment).
* **BR-10 (IT Staff Queue Access)**: IT Staff and Administrators have read access to all tickets in the shared Ticket Queue regardless of ticket ownership.
* **BR-11 (Queue Query Parameters)**: Queue search matches ticket number or summary case-insensitively. Filters support category, requested priority, IT priority, status, and ownership (`UNASSIGNED`, `ME`, or specific staff ID).
* **BR-12 (Ticket Ownership Rules)**: Ticket ownership (`ownerId`) may only be assigned to active users with `IT_STAFF` or `ADMINISTRATOR` role.
* **BR-13 (IT Priority Initialization & Update)**: When a ticket is created, `itPriority` defaults to `requestedPriority`. Only IT Staff and Administrators may alter `itPriority`.
* **BR-14 (State Transition Rules)**:
  * `NEW` -> `OPEN` (IT Staff claims or opens ticket)
  * `OPEN` -> `IN_PROGRESS` (IT Staff begins work)
  * `IN_PROGRESS` -> `WAITING_FOR_REQUESTER` (IT Staff requests details)
  * `WAITING_FOR_REQUESTER` -> `IN_PROGRESS` (Requester posts comment/details)
  * `IN_PROGRESS` -> `RESOLVED` (IT Staff resolves issue, or Requester indicates resolved)
  * `RESOLVED` -> `CLOSED` (IT Staff/Admin formally closes ticket)
  * `RESOLVED` -> `REOPENED` (Requester or IT Staff indicates issue persists)
  * `REOPENED` -> `IN_PROGRESS` (IT Staff resumes work)
  * Any state except `CLOSED` -> `CANCELLED` (IT Staff/Admin cancels invalid ticket)
* **BR-15 (Resolution Summary Requirement)**: Transitioning a ticket to `RESOLVED` requires a non-empty `resolutionSummary` text (minimum 5 characters).
* **BR-16 (Public Comments Author & Visibility)**: Public comments are visible to the Ticket Requester, IT Staff, and Administrators. Comment author is fixed to `currentUser.id`. Content must be 1 to 1000 characters after whitespace trimming.
* **BR-17 (Public Comments Immutability)**: Public comments are append-only. Editing and deletion are strictly prohibited.
* **BR-18 (Internal Notes Access Control)**: Internal Notes are accessible strictly to IT Staff and Administrators. Requester requests to `GET` or `POST` internal notes must return HTTP 403 Forbidden without revealing note existence or content.
* **BR-19 (Internal Notes Immutability)**: Internal Notes are append-only. Editing and deletion are strictly prohibited. Content must be 1 to 1000 characters.
* **BR-20 (Administrator Management Scope)**: User management operations (`/api/users/*`) are restricted exclusively to users with `ADMINISTRATOR` role. All other roles receive HTTP 403 Forbidden.
* **BR-21 (Single Role Assignment)**: Every user account has exactly one role from the enum (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
* **BR-22 (Email Uniqueness)**: User email addresses must be unique (case-insensitive). Duplicate email creation or update attempts must return HTTP 409 Conflict.
* **BR-23 (Self-Deactivation Guardrail)**: An Administrator cannot deactivate their own active account (`currentUser.id != targetUser.id` for deactivation). Attempts return HTTP 400 Bad Request.
* **BR-24 (Last Active Administrator Guardrail)**: The system must enforce that at least one active Administrator account exists at all times. Any action that would reduce active Administrators to zero must return HTTP 400 Bad Request.
* **BR-25 (No User Deletion)**: Hard deletion of user accounts is prohibited. Accounts are disabled by setting `isActive = false`.

---

## 6. UI Specification Summary
*(For detailed UI mockups, layout grids, visual tokens, state diagrams, and responsive rules, see [docs/lab-03/ui-spec.md](file:///c:/Users/UsEr/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-03/ui-spec.md))*

* **Theme & Token Continuity**: Extends Zen Green design system (`#006B3C` primary green, `#F5F7F6` canvas, `#EAF6EF` success/new tint, `#FFF8E1` amber warning/notes tint).
* **Application Header**: Displays logged-in user name, email, role badge (`Requester`, `IT Staff`, `Admin`), and a prominent `Logout` action button. Replaces Development Requester Selector.
* **Login & First Password Change**: Form controls with live client-side validation, password toggle visibility, error callouts, and enforced password strength meter.
* **IT Staff Ticket Queue**: Data grid (Desktop/Tablet) transforming into card list (Mobile) with search bar, filter chips, column sorting, pagination controls, and status/priority badges.
* **IT Ticket Detail View**: Structured card layout with read-only Requester details, inline IT Priority dropdown, Owner selector, Status transition action bar, Public Comments tab (pale green cards), and Internal Notes tab (amber tinted cards with private lock icon).
* **Administrator User Management**: Responsive table with Name, Email, Role badge, Status toggle, Search input, Role filter dropdown, and Modals for Create User, Edit User, and Reset Password.

---

## 7. Data Changes & Migration Strategy

### 7.1. Database Model Evolution (`server/prisma/schema.prisma`)
The Lab 2 schema is evolved to unify identity under the `User` model, establish Ticket Ownership by IT Staff, and add Public Comments and Internal Notes.

```prisma
enum UserRole {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

model User {
  id                 Int          @id @default(autoincrement())
  email              String       @unique
  passwordHash       String
  name               String
  department         String?
  role               UserRole     @default(REQUESTER)
  mustChangePassword Boolean      @default(true)
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  ticketsOwned       Ticket[]     @relation("TicketRequester")
  ticketsAssigned    Ticket[]     @relation("TicketOwner")
  attachmentsRemoved Attachment[] @relation("RemovedByUser")
  publicComments     PublicComment[]
  internalNotes      InternalNote[]

  @@index([role, isActive])
  @@index([email])
  @@map("users")
}

model PublicComment {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String   @db.Text
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Restrict)

  @@index([ticketId, createdAt(sort: Asc)])
  @@map("public_comments")
}

model InternalNote {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String   @db.Text
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Restrict)

  @@index([ticketId, createdAt(sort: Asc)])
  @@map("internal_notes")
}
```

* **Ticket Model Enhancements**:
  * `requesterId`: Foreign key to `User(id)` (relation `"TicketRequester"`).
  * `ownerId`: Nullable foreign key `Int?` to `User(id)` (relation `"TicketOwner"`).
  * `itPriority`: `PriorityLevel?` (defaults to `requestedPriority` upon creation).
  * `status`: Extended enum `TicketStatus` (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  * `publicComments`: Relation `PublicComment[]`.
  * `internalNotes`: Relation `InternalNote[]`.

### 7.2. Migration Strategy from Lab 2
1. **Data Preservation**: Existing `requester_users` table data is migrated into `users` table with `role = 'REQUESTER'`, `mustChangePassword = true`, and pre-hashed initial password (`Password123!`).
2. **Foreign Key Realignment**: Updates `tickets.requesterId` and `attachments.removedByRequesterId` to reference `users.id`.
3. **Idempotent Seeding (`prisma/seed.ts`)**:
   * Seed creates default accounts using bcrypt (hash rounds = 10):
     * **Admin**: `admin@toktickit.local` (Role: `ADMINISTRATOR`, Active)
     * **IT Staff**: `tech1@toktickit.local`, `tech2@toktickit.local`, `tech3@toktickit.local` (Role: `IT_STAFF`, Active), `tech_inactive@toktickit.local` (Inactive IT Staff)
     * **Requesters**: `jennifer.anderson@toktickit.local`, `michael.brown@toktickit.local`, `sarah.johnson@toktickit.local`, `david.lee@toktickit.local` (Active Requesters), `inactive.user@toktickit.local` (Inactive Requester)
   * Seeds realistic sample Tickets across statuses, priorities, assigned owners, Public Comments, and Internal Notes.

---

## 8. REST API Contract Summary
*(For exact JSON schemas, request/response bodies, header specifications, and error envelope details, see [docs/lab-03/api-spec.md](file:///c:/Users/UsEr/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-03/api-spec.md))*

| Endpoint Path | Method | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Authenticates credentials, establishes session cookie, returns user profile and `mustChangePassword` status. |
| `/api/auth/logout` | `POST` | Authenticated | Destroys active session and clears auth cookie. |
| `/api/auth/me` | `GET` | Authenticated | Returns current authenticated user profile, role, and password state. |
| `/api/auth/change-password` | `POST` | Authenticated | Updates user password, verifies strength/matching, sets `mustChangePassword = false`. |
| `/api/tickets` | `POST` | `REQUESTER` | Creates ticket bound to `currentUser.id`. |
| `/api/tickets` | `GET` | All Roles | Requesters receive owned tickets. IT Staff/Admin receive shared queue with search, filter, sort, pagination. |
| `/api/tickets/:id` | `GET` | All Roles | Returns ticket detail. Requesters restricted to owned tickets (403/404 for others). |
| `/api/tickets/:id/claim` | `PATCH` | `IT_STAFF`, `ADMINISTRATOR` | Assigns `ownerId` to `currentUser.id` and sets status `OPEN` if `NEW`. |
| `/api/tickets/:id/assign` | `PATCH` | `IT_STAFF`, `ADMINISTRATOR` | Assigns `ownerId` to specified IT Staff user ID. |
| `/api/tickets/:id/priority` | `PATCH` | `IT_STAFF`, `ADMINISTRATOR` | Updates `itPriority`. |
| `/api/tickets/:id/status` | `PATCH` | All Roles | Updates ticket status following permitted state transition matrix. |
| `/api/tickets/:id/comments` | `GET`, `POST` | All Roles (Owner check) | Lists or appends Public Comments. Author is `currentUser.id`. |
| `/api/tickets/:id/notes` | `GET`, `POST` | `IT_STAFF`, `ADMINISTRATOR` | Lists or appends Internal Notes. Requesters receive HTTP 403 Forbidden. |
| `/api/users` | `GET`, `POST` | `ADMINISTRATOR` | Lists users (with search/role filter) or creates a new user account. |
| `/api/users/:id` | `PATCH` | `ADMINISTRATOR` | Updates user Name, Email, Role, or Activation status (enforces safety guardrails). |
| `/api/users/:id/reset-password`| `POST` | `ADMINISTRATOR` | Resets user password to initial value and sets `mustChangePassword = true`. |

---

## 9. Acceptance Criteria

* **AC-01 (Valid Login)**: Given an active user with valid credentials, when POSTing to `/api/auth/login`, then the server sets an HTTP-only session cookie and returns HTTP 200 with user profile and role.
* **AC-02 (Inactive Login Rejection)**: Given an inactive user account (`isActive = false`), when submitting valid email and password, then login is rejected with HTTP 401 Unauthorized ("Account is inactive").
* **AC-03 (Mandatory First Password Intercept)**: Given a user with `mustChangePassword = true`, when logging in or navigating the app, then normal application routes remain inaccessible until a valid password change completes.
* **AC-04 (Password Change Validation)**: Given the Change Password screen, when supplying an invalid current password or a new password violating policy rules, then inline error messages block submission. Upon valid submission, `mustChangePassword` is set to `false`.
* **AC-05 (Logout Security)**: Given an authenticated user, when clicking Logout or POSTing to `/api/auth/logout`, then session is destroyed and subsequent protected API calls return HTTP 401 Unauthorized.
* **AC-06 (Requester Authentication Context)**: Given an authenticated Requester, when creating a ticket, then `requesterId` is automatically assigned to `currentUser.id` with zero possibility of client override.
* **AC-07 (Requester Data Isolation)**: Given Requester A, when attempting to fetch or modify a ticket owned by Requester B, then the API returns HTTP 403 Forbidden or 404 Not Found without leaking data.
* **AC-08 (IT Staff Queue Retrieval)**: Given an IT Staff user, when viewing `/staff/queue`, then all system tickets are rendered with search, filter, sort, and pagination capabilities.
* **AC-09 (IT Queue Search and Filtering)**: Given the IT Staff Queue, when searching for "VPN" and filtering by Priority "HIGH" and Status "IN_PROGRESS", then only matching tickets are displayed.
* **AC-10 (Ticket Ownership Claim & Reassign)**: Given an unassigned ticket, when an IT Staff clicks "Claim Ticket", then `ownerId` updates to the IT Staff's ID and status transitions to `OPEN`.
* **AC-11 (IT Priority Update)**: Given an IT Staff inspecting a ticket, when updating `itPriority` from `MEDIUM` to `URGENT`, then the database reflects the update and logs the change.
* **AC-12 (Permitted Status Transitions)**: Given an IT Staff user, when transitioning a ticket from `IN_PROGRESS` to `RESOLVED` with a resolution summary, then status updates successfully.
* **AC-13 (Requester Problem Resolved Indication)**: Given a Requester viewing an owned `IN_PROGRESS` or `WAITING_FOR_REQUESTER` ticket, when clicking "Problem Appears Resolved", then a Public Comment is posted and status updates to `RESOLVED`.
* **AC-14 (Public Comments Post & Read)**: Given a ticket owner or IT Staff, when submitting a Public Comment, then the comment appears immediately in the Public Comments timeline with author name, role badge, and timestamp.
* **AC-15 (Public Comments Immutability)**: Given existing Public Comments, no edit or delete controls are rendered or supported by the API.
* **AC-16 (Internal Notes Access Control)**: Given IT Staff or Admin, internal notes can be created and viewed. Given a Requester, requests to `/api/tickets/:id/notes` return HTTP 403 Forbidden.
* **AC-17 (Internal Notes Visual Separation)**: Given the IT Ticket Detail view, Internal Notes are rendered in a distinct amber-tinted section with a lock icon, preventing confusion with Public Comments.
* **AC-18 (Admin User List Retrieval)**: Given an Administrator, accessing `/admin/users` lists all user accounts with search by name/email and filter by role. Non-Admins receive HTTP 403 Forbidden.
* **AC-19 (Admin User Creation)**: Given an Administrator, submitting the Create User form with valid name, unique email, role, and initial password creates the user with `mustChangePassword = true`.
* **AC-20 (Duplicate Email Prevention)**: Given an Administrator creating/editing a user with an existing email, then HTTP 409 Conflict is returned with error detail.
* **AC-21 (Admin User Editing)**: Given an Administrator, editing a user's name, email, or role updates the record in PostgreSQL.
* **AC-22 (Admin Self-Deactivation Guardrail)**: Given an logged-in Administrator, attempting to toggle their own account to inactive returns HTTP 400 Bad Request with safety error message.
* **AC-23 (Last Admin Protection)**: Given a system with 1 active Administrator, attempting to deactivate or demote that Administrator returns HTTP 400 Bad Request ("Cannot deactivate the last active Administrator").
* **AC-24 (Admin Reset Initial Password)**: Given an Administrator, triggering "Reset Initial Password" sets a new initial password and updates `mustChangePassword = true` for the target user.
* **AC-25 (Regression Continuity)**: All Lab 2 ticket submission, reference data loading, attachment upload, and soft-removal features continue to function seamlessly under the new authentication engine.

---

## 10. Product Definition of Done (DoD)

- [ ] **Specification Complete**: `docs/lab-03/specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` are approved.
- [ ] **Database & Migration**: Schema evolved with `User`, `PublicComment`, `InternalNote`, ticket relations, indexes; migration executed; seed script creates 4+ Requesters, 3+ IT Staff, 1+ Admin, and realistic ticket data.
- [ ] **Authentication Engine**: Bcrypt password hashing, session creation/destruction, login/logout/me APIs, mandatory first-login password change intercept fully operational.
- [ ] **Server-Side Authorization**: Every REST endpoint enforces role permissions and ownership checks.
- [ ] **IT Staff Ticket Queue**: Search, filter, sort, pagination, desktop table, mobile card view operational.
- [ ] **IT Ticket Management**: Claim/reassign ownership, IT Priority picker, permitted status transitions, and resolution summary validation implemented.
- [ ] **Collaboration Features**: Append-only Public Comments (shared) and Internal Notes (IT/Admin only) operational with visual distinction.
- [ ] **Administrator User Console**: User list, search/filter, account creation, editing, initial password reset, self-deactivation guardrail, and last-admin protection enforced.
- [ ] **Zen Green Design & Responsiveness**: Verified across Desktop (>=992px), Tablet (768–991px), and Mobile (<768px) with zero layout overflow.
- [ ] **Automated Testing & Coverage**: Unit, API/Integration, UI Component, Security, and E2E Playwright test suites pass 100%.

---

## 11. Assumptions and Decisions

1. **Authentication Session Strategy**: For local lab development and testing simplicity, authentication relies on express-session HTTP-only cookies (or signed bearer tokens stored in secure cookie storage).
2. **Out-of-Band Initial Passwords**: Administrator-created users or reset accounts receive initial passwords out-of-band (e.g. displayed in the Admin UI upon creation for copy/pasting), avoiding external SMTP email dependencies.
3. **Single Role Assignment**: A user cannot hold multiple roles simultaneously. Role transitions (e.g. Requester to IT Staff) update the single `role` enum field.
4. **Requester Resolution Action**: When a Requester clicks "Problem Appears Resolved", the system appends a Public Comment stating the problem appears resolved and transitions ticket status from `IN_PROGRESS` / `WAITING_FOR_REQUESTER` to `RESOLVED`. Formal closing (`CLOSED`) remains an IT Staff / Admin action.
