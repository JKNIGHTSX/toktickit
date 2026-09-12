# Lab 2 — Peer Review Record

## 1. Author and Reviewer Information

* **Author**: `Chetsada` — Student ID: `67070501080` — GitHub: `@JKNIGHTSX`
* **Peer Reviewer**: `Khanatip` — Student ID: `67070501008` — GitHub: `Khanatip112`
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
  > "Your files are all good JK! I'll handle Reviewer.md and ai-use.md in issue 8. Let’s get to work!"
* **Developer Response**:
  > "Thank you for you review goodluck with Reviewer.md and ai-use.md in your issue8."
* **Status**: Resolved & Approved

### PR-02: Development Requester Context
* **Reviewer Comment**:
  >Migrations and prisma db seed ran smoothly with no duplicates.

API endpoints return correct reference data.

All tests passed (npm test 9/9).

Ready to merge into lab2-staging.
* **Developer Response**:
  > Alright such a good first step.
* **Status**: Resolved & Approved

### PR-03: Ticket Creation & Validation
* **Reviewer Comment**:
  > Everything looks great Let's keep going bro, we're almost done
* **Developer Response**:
  > half way to gooo.
* **Status**: Resolved & Approved

### PR-04: My Tickets Dashboard & Filtering
* **Reviewer Comment**:
  > All My tickets went smoothly! Great job, JK
* **Developer Response**:
  > Thank you khana half way to go.
* **Status**: Resolved & Approved

### PR-05: Ticket Detail & Attachment Lifecycle
* **Reviewer Comment**:
  > Ticket Details look good, JK Let's push forward and finish this
* **Developer Response**:
  > yeah almost there.
* **Status**: Resolved & Approved

### PR-06: Responsive & E2E Verification
* **Reviewer Comment**:
  >Everything looks good! Just one small thing could you check if there are any unused files, like zen-green.png
* **Developer Response**:
  > i check and it say it should have for submission.
* **Status**: Resolved & Approved

---

## 4. Pull Requests Reviewed for Peer Partner

* **Partner PR Link**: `https://github.com/Khanatip112/toktickit/pull/25`
* **Branch**: `feature/6-tests`
* **My Review Comment**:
  > All test are pass. Your work almost there.
* **Partner's Response**:
  > Thanks for the review, JK Hit me up if you run into token limit we can figure it out together.
* **Final Verdict**: Approved / Changes Requested

---

## 5. Release Pull Request (`lab2-staging` -> `main`)

* **Release PR Link**: `https://github.com/JKNIGHTSX/toktickit/pull/35`
* **Release Checklist**:
  * [] All 6 feature PRs merged into `lab2-staging`.
  * [] All automated unit, API, UI, and E2E tests pass from clean checkout.
  * [] Zero database migration conflicts.
  * [] Visual inspection confirmed on Desktop, Tablet, and Mobile.
  * [] Final peer approval signed off.
* **Reviewer Sign-off**:
  * Reviewer Name: `Khanatip`
  * Date: `2026-09-7`
  * Verdict: Approved for Main Merge
