# Lab 2 Test Plan and Results — TokTickIT Requester Ticketing MVP

## 1. Test Strategy

The testing strategy for TokTickIT Lab 2 adheres to **Test-Driven Development (TDD)** and **Test-Driven Design (Test DD)** principles. Automated tests provide full-stack verification across multiple layers:

```
                      +-----------------------------+
                      |          E2E Tests          |  Playwright (End-to-End User Journeys)
                      |  (requester-ticket-flow)    |
                      +-----------------------------+
                      |       UI Component &        |  Vitest + React Testing Library
                      |     Responsive Style Tests  |  (Component states, forms, responsive)
                      +-----------------------------+
                      |      API & Integration      |  Supertest + Vitest
                      |            Tests            |  (Endpoints, DB queries, Authz isolation)
                      +-----------------------------+
                      |          Unit Tests         |  Vitest
                      | (Generators, Validators)    |  (Ticket No, mime checks, sanitizers)
                      +-----------------------------+
```

1. **Unit Tests**: Verify isolated algorithmic logic such as ticket number formatting (`TKT-YYYY-NNNNNN`), string trimming, attachment MIME type detection, and byte size conversion.
2. **API & Integration Tests**: Use Supertest with live PostgreSQL database instances to test every REST endpoint, validation error responses, database constraints, soft-removal flags, and backend ownership isolation.
3. **UI Component & Style Tests**: Use Vitest with React Testing Library to verify component rendering, user interactions, form validation feedback, loading skeletons, empty/no-results states, modal dialogs, and Zen Green style tokens.
4. **Responsive & Visual Checks**: Verify desktop (>=992px), tablet (768–991px), and mobile (<768px) layouts, ensuring table-to-card transformations and zero horizontal page scrolling.
5. **End-to-End (E2E) Tests**: Use Playwright to simulate complete user flows across the full stack from requester selection to ticket creation, search, attachment management, and cross-user isolation.

---

## 2. Planned Tests Table

| Test ID | Type | Requirement / AC | What It Tests / Scenario | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-01** | Unit | BR-01, FR-05 | Ticket Number Generator format | Returns formatted `TKT-YYYY-NNNNNN` with valid year and 6 digits | `server/tests/lab-02/ticket-generator.unit.test.ts` | Planned |
| **UT-02** | Unit | BR-06, BR-07 | Form Input Trimming & Bounds | Trims whitespace; validates summary (5-150) and description (10-2000) | `server/tests/lab-02/validators.unit.test.ts` | Planned |
| **UT-03** | Unit | BR-10, BR-11 | Attachment Validator | Accepts JPG, PNG, WEBP, PDF <=5MB; rejects invalid types and oversized files | `server/tests/lab-02/attachment-validator.unit.test.ts` | Planned |
| **API-01** | API | FR-01, FR-02, AC-01 | GET `/api/requesters` | Returns `200 OK` with 4 active requesters; excludes inactive requester | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-02** | API | FR-03, AC-03 | GET `/api/categories` & `/api/related-systems` | Returns `200 OK` with 4 seeded categories and 7 related systems | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-03** | API | FR-04, FR-05, AC-04 | POST `/api/tickets` (Valid payload) | Returns `201 Created` with unique `ticketNumber`, status `NEW`, persisted in DB | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-04** | API | BR-06, BR-07, AC-05 | POST `/api/tickets` (Empty fields) | Returns `400 Bad Request` with field-level validation details | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-05** | API | BR-05, AC-01 | POST `/api/tickets` (Inactive Requester) | Returns `403 Forbidden` / `400 Bad Request` when inactive requester creates ticket | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-06** | API | BR-04, FR-08, AC-09 | GET `/api/tickets` (Requester A vs B) | Returns `200 OK` containing only Requester A's tickets; excludes Requester B's tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07** | API | FR-09, AC-11 | GET `/api/tickets?search=laptop` | Returns `200 OK` filtered to tickets matching "laptop" in number or summary | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-08** | API | FR-09, AC-12 | GET `/api/tickets?categoryId=2&requestedPriority=HIGH` | Returns `200 OK` filtered to tickets matching Category 2 AND Priority HIGH | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-09** | API | FR-10, AC-13 | GET `/api/tickets?sortBy=createdAt&sortOrder=asc` | Returns `200 OK` sorted in ascending created order | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-10** | API | FR-10, AC-09 | GET `/api/tickets?page=2&pageSize=5` | Returns `200 OK` with page 2 data and pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-11** | API | FR-11, AC-16 | GET `/api/tickets/:id` (Owned Ticket) | Returns `200 OK` with complete ticket details and attachment metadata list | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-12** | API | BR-04, FR-12, AC-10 | GET `/api/tickets/:id` (Cross-Requester access) | Returns `404 Not Found` or `403 Forbidden` when Requester B requests Requester A's ticket | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-13** | API | FR-07, AC-07 | POST `/api/tickets/:id/attachments` (Valid file) | Returns `201 Created` with attachment metadata; binary saved to disk | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-14** | API | BR-10, AC-07 | POST `/api/tickets/:id/attachments` (Invalid MIME `.exe`) | Returns `415 Unsupported Media Type` with safe error message | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-15** | API | BR-11, AC-07 | POST `/api/tickets/:id/attachments` (Oversized >5MB) | Returns `413 Payload Too Large` with safe error message | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-16** | API | BR-12, AC-08 | POST `/api/tickets/:id/attachments` (6th active file) | Returns `400 Bad Request` / `422 Unprocessable` when limit of 5 exceeded | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-17** | API | FR-13, AC-17 | GET `/api/attachments/:id/download` (Active file) | Returns `200 OK` with binary file stream and `Content-Disposition` header | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-18** | API | FR-14, BR-13, AC-18 | DELETE `/api/attachments/:id` (Soft remove) | Returns `200 OK`; sets `isRemoved: true`, records `removedAt` and `removedReason` | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-19** | API | FR-15, BR-14, AC-19 | GET `/api/attachments/:id/download` (Removed file) | Returns `410 Gone` with message; binary stream is strictly blocked | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-20** | API | BR-04, FR-12, AC-10 | GET `/api/attachments/:id/download` (Cross-Requester) | Returns `404 Not Found` / `403 Forbidden` when Requester B downloads Requester A's file | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **UI-01** | UI | FR-01, FR-02, AC-01 | Requester Select component | Renders active requesters dropdown; selects context and updates shell | `client/src/tests/lab-02/RequesterSelect.test.tsx` | Planned |
| **UI-02** | UI | AC-02 | Unselected Requester guard | Prompts or redirects to selector when navigating without active context | `client/src/tests/lab-02/RequesterSelect.test.tsx` | Planned |
| **UI-03** | UI | BR-06, BR-07, AC-05 | Create Ticket validation failure | Renders inline error messages below empty/invalid fields; blocks API dispatch | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-04** | UI | BR-15, AC-04 | Create Ticket busy submission state | Disables Submit button and renders "Submitting Ticket…" spinner while processing | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-05** | UI | BR-16, AC-21 | Create Ticket API failure state | Preserves user-entered form inputs when API call fails; displays error banner | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-06** | UI | FR-08, AC-14 | My Tickets Empty state | Renders "No tickets submitted yet" empty state with "Create Ticket" button | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-07** | UI | FR-09, AC-15 | My Tickets No-Results state | Renders "No matching tickets" state with working "Clear Filters" button | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-08** | UI | FR-09, FR-10, AC-12 | My Tickets Filtering & Pagination | Interacting with category/status filters updates table; page navigation updates view | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-09** | UI | FR-11, AC-16 | Requester Ticket Detail Read-Only View | Renders ticket fields with `#F0F4F1` read-only styling, correct badges, and layout | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| **UI-10** | UI | FR-14, BR-13, AC-18 | Attachment Section active & soft removal | Renders active files with download/remove; opening remove modal submits soft removal | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **UI-11** | UI | FR-15, BR-14, AC-19 | Attachment Section removed file display | Renders strikethrough filename, "Removed" badge, reason, and disabled download | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **UI-12** | UI Style | Section 7, AC-22 | Zen Green styling & theme tokens | Verifies primary green `#006B3C`, secondary `#0B7A46`, pale `#EAF6EF`, contrast | `client/src/tests/lab-02/ThemeStyles.test.tsx` | Planned |
| **RESP-01** | Responsive | AC-22 | Desktop viewport (1200px) | Full 3-column form grid, complete data table, zero overflow | `client/src/tests/lab-02/ResponsiveLayout.test.tsx` | Planned |
| **RESP-02** | Responsive | AC-22 | Tablet viewport (768px) | 2-column form grid, compact table layout, no horizontal scroll | `client/src/tests/lab-02/ResponsiveLayout.test.tsx` | Planned |
| **RESP-03** | Responsive | AC-22 | Mobile viewport (375px) | 1-column stacked form, data table converts to cards, buttons full width | `client/src/tests/lab-02/ResponsiveLayout.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01 - AC-04 | End-to-end Ticket Creation Flow | Selects Jennifer -> fills form -> attaches PDF -> submits -> verifies Ticket No | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-02** | E2E | AC-09, AC-11, AC-12 | End-to-end My Tickets Search & Filter | Locates created ticket in My Tickets -> tests search and category filter | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-03** | E2E | AC-16 - AC-19 | End-to-end Ticket Detail & Attachment Lifecycle | Opens detail -> downloads PDF -> uploads 2nd file -> soft removes 1st -> verifies 410 block | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-04** | E2E | AC-09, AC-10, AC-20 | End-to-end Requester Switching & Isolation | Switches to Michael -> verifies Jennifer's tickets disappear -> tests direct URL denial | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Description Summary | Covered By Test IDs |
| :--- | :--- | :--- |
| **AC-01** | Active Requester Selection List | `API-01`, `UI-01`, `E2E-01` |
| **AC-02** | Requester Context Protection | `UI-02` |
| **AC-03** | Reference Data Rendering (Categories/Systems) | `API-02`, `UI-01`, `E2E-01` |
| **AC-04** | Successful Ticket Creation & System Fields | `UT-01`, `API-03`, `UI-04`, `E2E-01` |
| **AC-05** | Validation Failure on Missing Required Fields | `UT-02`, `API-04`, `UI-03` |
| **AC-06** | Validation Failure on Character Limits | `UT-02`, `API-04`, `UI-03` |
| **AC-07** | Attachment Type and Size Validation | `UT-03`, `API-13`, `API-14`, `API-15` |
| **AC-08** | Maximum Active Attachment Constraint (5 max) | `API-16`, `UI-10` |
| **AC-09** | Requester Ticket Ownership Isolation (List View) | `API-06`, `UI-06`, `E2E-02`, `E2E-04` |
| **AC-10** | Requester Ticket Ownership Isolation (Direct Detail/File) | `API-12`, `API-20`, `E2E-04` |
| **AC-11** | Ticket Search Functionality | `API-07`, `UI-08`, `E2E-02` |
| **AC-12** | Ticket Multi-Field Filtering | `API-08`, `UI-08`, `E2E-02` |
| **AC-13** | Ticket Sorting | `API-09`, `UI-08` |
| **AC-14** | Empty State Display | `UI-06` |
| **AC-15** | No-Results State with Clear Filters | `UI-07`, `E2E-02` |
| **AC-16** | Read-Only Detail View Fidelity | `API-11`, `UI-09`, `E2E-03` |
| **AC-17** | Active Attachment Download | `API-17`, `UI-10`, `E2E-03` |
| **AC-18** | Soft Removal of Attachment with Reason | `API-18`, `UI-10`, `E2E-03` |
| **AC-19** | Blocked Download of Soft-Removed Attachment (`410 Gone`) | `API-19`, `UI-11`, `E2E-03` |
| **AC-20** | Requester Switching Dynamic Refresh | `API-06`, `UI-01`, `E2E-04` |
| **AC-21** | Network Failure & State Preservation | `UI-05` |
| **AC-22** | Responsive Viewport Compliance & Zen Green Styles | `UI-12`, `RESP-01`, `RESP-02`, `RESP-03` |

---

## 4. Responsive and Visual Checklist

* [ ] **Zen Green Palette Verification**:
  * [ ] Header background is `#006B3C`
  * [ ] Active elements, links, and focus rings use `#0B7A46`
  * [ ] Highlight rows and `NEW` badges use `#EAF6EF`
  * [ ] Canvas background is `#F5F7F6`
* [ ] **Control State Contrast & Distinctness**:
  * [ ] Read-only fields have distinct `#F0F4F1` background shading and `not-allowed`/default cursor
  * [ ] Editable fields have clear white `#FFFFFF` background with 1px border
  * [ ] Validation error messages are dark red `#B3261E` and positioned directly beneath invalid inputs
  * [ ] Required fields display clear red asterisk `*`
* [ ] **Button States**:
  * [ ] Submit buttons display a busy spinner and disabled state during processing
  * [ ] Destructive buttons are clearly styled in red/danger
  * [ ] Icon-only buttons have accessible tooltips and `aria-label`
* [ ] **Responsive Breakpoint Verification**:
  * [ ] **Desktop (>= 992px)**: Form fields in multi-column layout; My Tickets displays complete table.
  * [ ] **Tablet (768–991px)**: Form fields in 2-column layout; table adjusts without horizontal page scroll.
  * [ ] **Mobile (< 768px)**: Form fields stack vertically in single column; My Tickets transforms from table to vertical card list.
  * [ ] **No Horizontal Overflow**: Page width is strictly constrained to `100vw` with zero horizontal scrollbars at 375px, 768px, and 1200px.

---

## 5. Test Commands

### 5.1. Backend API & Unit Tests (Vitest + Supertest)
```bash
# In server/ directory
npm test
# Run specific Lab 2 API test suite
npx vitest run tests/lab-02/
```

### 5.2. Frontend UI & Component Tests (Vitest + React Testing Library)
```bash
# In client/ directory
npm test
# Run specific Lab 2 UI test suite
npx vitest run src/tests/lab-02/
```

### 5.3. End-to-End Tests (Playwright)
```bash
# In root directory
npx playwright test e2e/lab-02/
```

### 5.4. Full Verification Script
```bash
# Backend validation
cd server && npm run lint && npm run build && npm test
# Frontend validation
cd ../client && npm run lint && npm run build && npm test
```

---

## 6. Final Results

*(To be populated during Phase 2 implementation when test suites are executed on `feature/*` branches and verified on `lab2-staging`)*

| Layer | Planned Tests | Passing | Failing | Skipped | Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unit Tests** | 3 | 0 (Planned) | 0 | 0 | - |
| **API Integration Tests** | 17 | 0 (Planned) | 0 | 0 | - |
| **UI Component & Style Tests** | 12 | 0 (Planned) | 0 | 0 | - |
| **Responsive Tests** | 3 | 0 (Planned) | 0 | 0 | - |
| **E2E Tests** | 4 | 0 (Planned) | 0 | 0 | - |
| **Total** | **39** | **0 (Planned)** | **0** | **0** | - |

---

## 7. Known Limitations or Deferred Tests

1. **Authentication & Session Tokens**: Passwords, bcrypt hashing, JWT validation, and session cookies are deferred to Lab 3; Lab 2 tests verify the temporary `X-Requester-Id` Development context header.
2. **IT Staff Workflow & Status Transitions**: Changing ticket status from `NEW` to `OPEN`/`IN_PROGRESS`/`RESOLVED` and assigning tickets to staff are deferred to Lab 3; Lab 2 tests verify that tickets are created as `NEW` and remain read-only for Requesters.
3. **Comments & Audit Logs**: Public comments, internal notes, and Actions Taken feeds are deferred to subsequent sprints.
