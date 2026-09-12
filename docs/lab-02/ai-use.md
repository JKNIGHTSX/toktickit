# Lab 2 — AI Assistance and Reflection

## 1. AI Agent Information

* **LLM / Coding Assistant**: Gemini 3.7 Flash (via Google DeepMind Antigravity AI Pair Programmer)
* **Methodology**: Spec-Driven Development (Spec DD) & Test-Driven Development (TDD)
* **Role**: Technical Pair Programmer for Requirements Analysis, Architecture Design, Contract Specification, and Test Planning.

---

## 2. Selected Key Prompts (6–10)

| # | Development Phase | Prompt (Summarized) | Purpose / Goal | Student Action & Decision |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Requirements Extraction | "Analyze the Lab 2 stakeholder request and extract all explicit requirements versus proposed engineering decisions and deferred items." | Establish clear scope boundaries and eliminate unauthorized scope creep (e.g. auth, IT staff triage). | **Accepted**: Adopted explicit exclusions and structured scope into `specification.md`. |
| **2** | Business Rules Formulation | "Formulate numbered business rules (BR-01 through BR-20) covering ticket numbering, initial status, ownership isolation, attachment constraints, and failure recovery." | Create unambiguous, testable business rules governing system behavior. | **Adjusted**: Clarified that attachment soft removal must retain audit metadata but return HTTP 410 Gone on download attempts. |
| **3** | Database Design & Migration | "Design a PostgreSQL schema increment using Prisma for RequesterUser, Ticket, Attachment, Category, and RelatedSystem with indexing strategy." | Ensure optimal query performance on requester tickets (`requesterId, createdAt DESC`) and idempotent seed data. | **Accepted**: Approved schema design and justified composite index in `specification.md`. |
| **4** | REST API Contract | "Specify complete REST API contracts for ticket submission, paginated listing, search/filter/sort, attachment upload, metadata, download, and soft removal." | Define exact HTTP methods, headers, payload envelopes, and status codes (200, 201, 400, 403, 404, 410, 413, 415). | **Adjusted**: Added `X-Requester-Id` header convention alongside query parameters to simulate dev identity. |
| **5** | UI Design System & Tokens | "Define the Zen Green Theme UI specification including exact color hex codes (#006B3C, #0B7A46, #EAF6EF), typography, component states, and responsive layout rules." | Establish consistent, reusable presentation guidelines across Desktop, Tablet, and Mobile. | **Accepted**: Incorporated complete color palette and responsive table-to-card specifications in `ui-spec.md`. |
| **6** | Acceptance Criteria Drafting | "Draft numbered Acceptance Criteria (AC-01 through AC-22) in Given-When-Then format covering all happy paths, validation failures, boundaries, and security isolation." | Establish verifiable conditions for the Definition of Done. | **Accepted**: Mapped all functional requirements to testable Gherkin-style criteria. |
| **7** | Test Planning & Traceability | "Construct a full-stack test plan covering Unit, API, UI, Responsive, and E2E layers with an Acceptance-Criterion Traceability Matrix." | Guarantee 100% test coverage before writing implementation code. | **Adjusted**: Added dedicated test cases for HTTP 410 blocked download, cross-requester API isolation, and inactive requester exclusion. |
| **8** | GitHub Issue Decomposition | "Decompose Lab 2 into 6 incremental GitHub issues with dedicated feature branch names and staging pull request flow." | Plan a clean, reviewable Git workflow aligned with team engineering practices. | **Accepted**: Structured PR sequence into `reviewer.md`. |

---

## 3. Reflection

### 3.1. What Made the Prompts Effective
Using structured, context-rich prompts with explicit constraints was essential for maintaining rigor. By demanding separation between *explicit lab requirements*, *team engineering decisions*, and *assumptions*, the AI agent avoided making undocumented assumptions or hallucinating unsupported features. Framing test cases around concrete HTTP status codes (e.g. `410 Gone` for soft-removed downloads, `403/404` for cross-requester isolation) ensured the API contract was immediately testable.

### 3.2. Corrections and Adjustments
During the initial drafting of the attachment specifications, the agent initially proposed a standard physical deletion for attachments. I corrected this by enforcing the strict soft-removal rule: when an attachment is removed, its database record is updated (`isRemoved = true`, `removedReason`, `removedAt`), physical storage is retained for compliance, and any future download attempts are blocked with an HTTP 410 status. Additionally, I ensured that inactive development requesters are not only hidden in the UI dropdown but also rejected by backend validation if passed via direct API calls.

### 3.3. Key Takeaway
Spec-Driven Development with an AI pair programmer works best when the human engineer acts as the architectural gatekeeper. Establishing the specification, contracts, and test plans first creates an inviolable standard against which the coding agent can later be evaluated during implementation.
