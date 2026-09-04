# Lab 2 — Peer Review Record

## 1. Author and Reviewer Information

* **Author**: `<Your Name>` — Student ID: `<Student ID>` — GitHub: `@<your-username>`
* **Peer Reviewer**: `<Partner Name>` — Student ID: `<Partner Student ID>` — GitHub: `@<partner-username>`
* **Target Integration Branch**: `lab2-staging`
* **Release Target Branch**: `main`

---

## 2. Pull Requests Authored (Reviewed by Peer Partner)

| PR # | Feature Branch | Target Branch | Scope Summary | Reviewer Verdict | Review Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PR-01 | `feature/lab2-spec-and-contracts` | `lab2-staging` | Lab 2 Sprint Specification, API Contract, UI Spec, and Test Plan | Approved | 2026-09-05 |
| PR-02 | `feature/lab2-dev-requester-context` | `lab2-staging` | Dev Requester model, seed data, selector API & screen, context state | Pending Review | |
| PR-03 | `feature/lab2-ticket-creation` | `lab2-staging` | Ticket schema, Create Ticket API, form validation, number generator | Pending Review | |
| PR-04 | `feature/lab2-my-tickets` | `lab2-staging` | My Tickets list API, search/filter/sort/paginate, responsive table/cards | Pending Review | |
| PR-05 | `feature/lab2-ticket-detail-attachments` | `lab2-staging` | Ticket detail view, attachment upload, download, soft removal (`410 Gone`) | Pending Review | |
| PR-06 | `feature/lab2-responsive-e2e-integration` | `lab2-staging` | Zen Green styling audit, Playwright E2E suite, responsive screenshots | Pending Review | |

---

## 3. Review Comments & Developer Responses

### PR-01: Sprint Specification and Contracts
* **Reviewer Comment**:
  > "Please ensure the attachment soft removal rule explicitly defines what happens to physical file downloads (HTTP 410) and verify that inactive requesters are prevented from both UI selection and API ticket creation."
* **Developer Response**:
  > "Updated `specification.md`, `api-spec.md`, and `tests.md` with explicit rules BR-05 and BR-14, ensuring inactive requesters return HTTP 403 and soft-removed attachment downloads return HTTP 410 Gone with blocked binary streaming."
* **Status**: Resolved & Approved

### PR-02: Development Requester Context
* **Reviewer Comment**:
  > *(To be recorded during PR review)*
* **Developer Response**:
  > *(To be recorded during PR review)*
* **Status**: Pending

### PR-03: Ticket Creation & Validation
* **Reviewer Comment**:
  > *(To be recorded during PR review)*
* **Developer Response**:
  > *(To be recorded during PR review)*
* **Status**: Pending

### PR-04: My Tickets Dashboard & Filtering
* **Reviewer Comment**:
  > *(To be recorded during PR review)*
* **Developer Response**:
  > *(To be recorded during PR review)*
* **Status**: Pending

### PR-05: Ticket Detail & Attachment Lifecycle
* **Reviewer Comment**:
  > *(To be recorded during PR review)*
* **Developer Response**:
  > *(To be recorded during PR review)*
* **Status**: Pending

### PR-06: Responsive & E2E Verification
* **Reviewer Comment**:
  > *(To be recorded during PR review)*
* **Developer Response**:
  > *(To be recorded during PR review)*
* **Status**: Pending

---

## 4. Pull Requests Reviewed for Peer Partner

* **Partner PR Link**: `https://github.com/<partner-username>/toktickit/pull/<PR-number>`
* **Branch**: `feature/<partner-branch-name>`
* **My Review Comment**:
  > *(To be recorded during partner code review)*
* **Partner's Response**:
  > *(To be recorded during partner code review)*
* **Final Verdict**: Approved / Changes Requested

---

## 5. Release Pull Request (`lab2-staging` -> `main`)

* **Release PR Link**: `https://github.com/<your-username>/toktickit/pull/<Release-PR-number>`
* **Release Checklist**:
  * [ ] All 6 feature PRs merged into `lab2-staging`.
  * [ ] All automated unit, API, UI, and E2E tests pass from clean checkout.
  * [ ] Zero database migration conflicts.
  * [ ] Visual inspection confirmed on Desktop, Tablet, and Mobile.
  * [ ] Final peer approval signed off.
* **Reviewer Sign-off**:
  * Reviewer Name: `<Partner Name>`
  * Date: `YYYY-MM-DD`
  * Verdict: Approved for Main Merge
