# Lab 4 — AI Assistance and Reflection

## 1. AI Agent Information

* **LLM / Assistant**: Gemini 3.8 Flash & Antigravity AI Pair Programmer
* **Methodology**: Spec-Driven Development (Spec DD) & Test-Driven Design (Test DD)
* **Sprint**: Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression
* **Role**: Technical Pair Programmer for Requirements Analysis, Architecture Design, Contract Specification, Test Planning, Full-Stack Implementation, and QA Verification.

---

## 2. Selected Key Prompts (6–10)

| # | Development Phase | Prompt (Summarized) | Purpose / Goal | Student Action & Decision |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Requirements Extraction & Scope Definition | "Analyze SE Lab 4.pdf stakeholder request and extract all functional requirements for Actions Taken, parent-child work structure, role dashboards, and ticket resolution gate." | Establish clear scope boundaries, numbered business rules, and explicit exclusions before code implementation. | **Accepted**: Formatted 12 functional requirements, 28 business rules, and 22 acceptance criteria into `docs/lab-04/specification.md`. |
| **2** | Work Execution vs. Ownership Architecture | "Model the database relationship for Actions Taken ensuring that any active IT Staff member can execute and record work without changing the ticket's primary Ticket Owner." | Decouple ticket administrative ownership (`ownerId`) from operational execution (`performedById`). | **Accepted**: Designed `ActionTaken` model referencing `Ticket` and `User` (performer), with explicit business rules (BR-02, BR-08) preventing unwanted owner mutation. |
| **3** | Ticket Resolution Gate Design | "Design the backend ticket resolution gate requiring at least one Action Taken and a non-empty resolution summary (>=5 chars) before transitioning to RESOLVED." | Prevent superficial ticket closure without documented technical intervention. | **Adjusted**: Enforced resolution gate strictly on the server REST API layer (`PATCH /api/tickets/:id/status`) returning HTTP 422, ensuring client-side bypass is impossible. |
| **4** | Advisory Requester Resolution Semantics | "Specify the Requester 'Problem Appears Resolved' interaction so that it posts a public comment and alerts staff, but does not directly set the ticket to RESOLVED." | Adhere to stakeholder mandate that Requesters signal resolution while IT Staff formally verify and close tickets. | **Accepted**: Specified advisory workflow (BR-18, AC-13) preserving IT Staff formal review. |
| **5** | Authoritative Dashboard Calculations | "Define database query logic and REST API contracts for Requester and IT Staff dashboards, ensuring metrics are computed server-side from authoritative data rather than client filtering." | Guarantee high performance and data security (Requester data isolation). | **Accepted**: Defined `GET /api/dashboard/requester` and `GET /api/dashboard/staff` returning lightweight metric counters and recent tickets. |
| **6** | Optimistic Concurrency & Safe Failure | "Define concurrency control for ticket status and Action Taken updates using updatedAt timestamps to prevent stale overwrite conflicts." | Protect against multi-technician race conditions during concurrent triage. | **Accepted**: Specified `expectedUpdatedAt` payload check returning HTTP 409 Conflict with clear client recovery instructions (BR-19, AC-14). |
| **7** | Full-Stack Test Planning & Traceability | "Construct a complete test plan covering Unit, API/Integration, UI Component, Authorization, Responsive, and E2E Playwright tests mapped to all 22 acceptance criteria." | Ensure 100% verification coverage and audit readiness before implementation. | **Accepted**: Generated `docs/lab-04/tests.md` detailing 28 planned test cases and traceability matrix. |
| **8** | UI & Accessibility Specification | "Document Zen Green UI extensions for the dashboard grids, Actions Taken table/cards, conditional follow-up note input, and WCAG AA accessibility rules." | Maintain aesthetic harmony with Lab 2–3 design tokens across Desktop, Tablet, and Mobile. | **Accepted**: Authored `docs/lab-04/ui-spec.md` with responsive breakpoints, state diagrams, and color tokens. |

---

## 3. Reflection

### 3.1. What Made the Prompts Effective
Focusing prompts on *architectural invariants* and *negative test cases* (e.g., verifying that Requesters cannot create Actions Taken, or verifying that a ticket with 0 actions cannot transition to `RESOLVED`) yielded unambiguous specifications. Specifying concrete database schemas, HTTP status codes (`400`, `403`, `409`, `422`), and error code identifiers (`RESOLUTION_REQUIRES_ACTION_TAKEN`, `STALE_UPDATE_CONFLICT`) upfront eliminates guesswork during subsequent implementation sprints.

### 3.2. Key Architectural Takeaways
1. **Decoupling Coordination from Execution**: Separating the primary Ticket Owner from the Action Taken performer solves the real-world service desk scenario where a senior technician coordinates a ticket while multiple specialists execute hardware replacement, network config, and testing.
2. **Authoritative Server Gates vs. Client Guidance**: Hiding buttons or disabling inputs in React provides good UX, but the backend must remain the authoritative enforcement engine. The resolution gate must be defended at the API layer.
3. **Optimistic Concurrency**: In a multi-user environment where both technicians and requesters interact with tickets simultaneously, timestamp-based concurrency detection is essential to prevent silent data loss.
