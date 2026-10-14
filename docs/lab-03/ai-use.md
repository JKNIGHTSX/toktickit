# Lab 3 — AI Assistance and Reflection

## 1. AI Agent Information

* **LLM / Coding Assistant**: Gemini 2.5 Pro & Claude Opus 4 (via Google DeepMind Antigravity AI Pair Programmer)
* **Methodology**: Spec-Driven Development (Spec DD) & Test-Driven Design (Test DD)
* **Role**: Technical Pair Programmer for Requirements Analysis, Architecture Design, Contract Specification, Test Planning, Full-Stack Implementation, and QA Verification.

---

## 2. Selected Key Prompts (6–10)

| # | Development Phase | Prompt (Summarized) | Purpose / Goal | Student Action & Decision |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Requirements Extraction | "Analyze the Lab 3 stakeholder request and extract all functional requirements for Authentication, IT Staff Workflow, Administrator User Management, and Public Comments / Internal Notes." | Define clear scope boundaries separating Lab 3 deliverables from deferred features (MFA, SSO, SLA, email delivery). | **Accepted**: Structured all explicit and excluded scope into `specification.md` with 14 functional requirements, 25 business rules, and 25 acceptance criteria. |
| **2** | Database Migration Strategy | "Design the migration strategy to evolve Lab 2's RequesterUser table into a unified User model with bcrypt password hashing, role enum, and mustChangePassword flag, while preserving all existing ticket and attachment foreign key relationships." | Ensure zero-downtime migration with data preservation for existing Requester records. | **Adjusted**: Added explicit idempotent seeding logic to handle both fresh databases and existing Lab 2 data, ensuring migrated requesters receive `mustChangePassword = true` and hashed default password. |
| **3** | Authentication Engine | "Implement express-session with HTTP-only cookies, bcrypt password verification, mandatory first-login password change middleware, and secure session destruction on logout. Define the complete auth API contract for login, logout, me, and change-password endpoints." | Build the security foundation without external dependencies (no JWT, no Redis session store for lab scope). | **Accepted**: Approved session-based auth with middleware intercept. Ensured inactive account rejection returns safe error message without leaking password validity per BR-02. |
| **4** | State Transition Matrix | "Design a ticket status state machine supporting the full lifecycle: NEW → OPEN → IN_PROGRESS → WAITING_FOR_REQUESTER → RESOLVED → CLOSED, with REOPENED and CANCELLED branches. Define which roles can trigger which transitions and enforce resolution summary requirements." | Create a deterministic, testable state machine aligned with IT service desk operational reality. | **Adjusted**: Explicitly restricted Requesters from directly setting RESOLVED status — they can only signal "Problem Appears Resolved" which creates a Public Comment and triggers the transition server-side. Added `resolutionSummary` minimum length requirement (5 chars). |
| **5** | Internal Notes Access Control | "Implement Internal Notes with strict server-side role enforcement: IT Staff and Administrators can GET and POST notes. Requesters must receive HTTP 403 Forbidden for both GET and POST operations, without revealing note existence or content." | Prevent information leakage — a Requester must never know whether internal discussion exists on their ticket. | **Accepted**: Implemented dual-tab UI with amber-tinted visual separation per Zen Green spec. Server-side enforcement verified with dedicated API tests (API-16, API-17, API-18). |
| **6** | Administrator Safety Guardrails | "Implement self-deactivation prevention (BR-23), last active Administrator protection (BR-24), email uniqueness enforcement (BR-22), and no-deletion policy (BR-25) in the user management API." | Prevent catastrophic administrative lockouts while maintaining data integrity constraints. | **Adjusted**: Added explicit count query before admin deactivation/demotion to verify at least one active Administrator remains. Ensured the same guardrail fires for both `isActive = false` and role demotion from ADMINISTRATOR. |
| **7** | Full-Stack Test Planning | "Construct a comprehensive test plan with traceability matrix mapping all 25 acceptance criteria to automated test IDs across Unit, API, UI Component, and E2E layers. Generate test file stubs for all lab-03 test suites." | Guarantee 100% requirements coverage before final integration. | **Accepted**: Created 38 planned test IDs with complete AC ↔ Test traceability. All tests ultimately pass: 218 server + 112 client + 18 E2E. |
| **8** | Responsive QA & Screenshot Evidence | "Execute Playwright E2E tests across Desktop (1200×800), Tablet (768×1024), and Mobile (375×667) viewports. Generate screenshots for Login, Change Password, Staff Queue, Staff Ticket Detail, and User Management. Fix any discovered defects." | Meet the Definition of Done requirement for visual verification across 3 breakpoints with zero layout overflow. | **Adjusted**: Fixed 4 QA defects discovered during E2E execution — AuthContext loading state race, bcrypt seed assertion scope, strict text matching, and viewport resize navigation issues. |

---

## 3. Reflection

### 3.1. What Made the Prompts Effective
Structuring prompts around *specific engineering artifacts* (state machine, migration plan, authorization matrix) rather than vague feature requests produced implementation-ready specifications. By explicitly requiring the AI to map every business rule to a testable acceptance criterion and then to a specific test file, we maintained full traceability from requirements to passing test suites. The technique of asking the AI to "define what should NOT happen" (e.g., Requesters must NOT see internal notes, Admins must NOT deactivate themselves) was especially effective for security requirements.

### 3.2. Corrections and Adjustments
Several corrections were necessary during development:

1. **AuthContext Loading State**: The AI initially set `isLoading(true)` during the `login()` and `logout()` calls in AuthContext, which caused the parent `AppContent` component to unmount the Login form during submission — wiping the error state before the user could see the 401 error message. I corrected this by removing the global loading toggle from `login`/`logout` while keeping it for `changePassword` and initial `checkAuth`.

2. **Requester Resolution Semantics**: The initial implementation allowed Requesters to directly PATCH ticket status to `RESOLVED`. I corrected this to use a dedicated `/problem-appears-resolved` endpoint that creates a Public Comment and performs the status transition server-side, matching the stakeholder intent that Requesters *signal* resolution rather than *command* it.

3. **Seed Data Bcrypt Scoping**: A test assertion comparing all users' passwords against the default seed password failed because E2E tests had created additional users with different passwords. I corrected the test to scope the bcrypt verification to known seeded email addresses only.

4. **E2E Viewport Race Condition**: The responsive visual QA test navigated to `page.goto("/")` in each viewport iteration, which triggered session revalidation and DOM detachment. I corrected this by logging in once upfront and only resizing the viewport without re-navigating.

### 3.3. Key Takeaway
Lab 3 demonstrated that the most critical architectural decisions in a multi-role system are not the happy paths — they are the *denial paths*. The security invariants (who CANNOT do what) proved far more important to specify and test rigorously than the positive workflows. Spec-Driven Development with an AI pair programmer excels when the human engineer focuses on defining and verifying these negative invariants, while the AI handles the mechanical implementation of the positive flows.
