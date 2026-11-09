# Lab 4 — Peer Review Record

## 1. Author and Reviewer Information

* **Author**: `Chetsada` — Student ID: `67070501080` — GitHub: `@JKNIGHTSX`
* **Peer Reviewer**: `Khanatip` — Student ID: `67070501008` — GitHub: `Khanatip112`
* **Target Integration Branch**: `lab4-staging`
* **Release Target Branch**: `main`

---

## 2. Pull Requests Authored (Reviewed by Peer Partner)

| PR # | Feature Branch | Target Branch | Scope Summary | Reviewer Verdict | Review Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PR #58 | `feature/lab4-spec-and-tests` | `lab4-staging` | Lab 4 engineering contract and test plan | APPROVED | 2026-10-22 |
| PR #67 | `feature/lab4-actions-taken-api` | `lab4-staging` | Actions Taken schema and API | APPROVED after regression-test feedback | 2026-10-31 |
| PR #68 | `feature/lab4-actions-ui` | `lab4-staging` | Actions Taken UI | APPROVED | 2026-11-01 |
| PR #69 | `feature/lab4-ticket-workflow` | `lab4-staging` | Ticket status workflow and resolution gate | APPROVED after test feedback | 2026-11-01 |
| PR #70 | `feature/lab4-staff-dashboard-api` | `lab4-staging` | Staff and administrator dashboard API | APPROVED | 2026-11-02 |
| PR #71 | `feature/lab4-requester-dashboard-api` | `lab4-staging` | Requester dashboard API | APPROVED | 2026-11-03 |
| PR #72 | `feature/lab4-rolebase-UI` | `lab4-staging` | Role-based dashboard UI and drill-down navigation | APPROVED after dashboard-filter feedback | 2026-11-08 |

---

## 3. Recorded GitHub Review Events

* **PR #58**: Approved by `Khanatip112` on 2026-10-22.
* **PR #67**: Earlier reviews requested correction of two Lab 1 regression failures; the updated commit was approved on 2026-10-31.
* **PR #68**: Approved by `Khanatip112` on 2026-11-01.
* **PR #69**: A review noted failing server tests; the updated commit was approved on 2026-11-01.
* **PR #70**: Approved by `Khanatip112` on 2026-11-02.
* **PR #71**: Approved by `Khanatip112` on 2026-11-03.
* **PR #72**: A review noted that dashboard drill-down filters were not applied; the updated commit was approved on 2026-11-08.

---

## 4. Pull Requests Reviewed for Peer Partner

| PR | Branch | My Review Comment | Partner's Response | Final Verdict |
| :--- | :--- | :--- | :--- | :--- |
| Partner Lab 4 PRs | `feature/lab4-*` | Reviewed all partner Lab 4 feature PRs across the sprint | Acknowledged and adjusted where needed | APPROVED |

---

## 5. Acceptance Criteria Verification Sign-off

| AC | Description | Verified In | Status |
| :--- | :--- | :--- | :--- |
| AC-01 | Create Action Taken (IT Staff/Admin) | `API-01`, `UI-01`, `E2E-01` | ✅ PASS |
| AC-02 | Follow-up Validation on Create | `UT-01`, `API-02`, `UI-01` | ✅ PASS |
| AC-03 | Attachment Notes Storage | `API-03`, `UI-01` | ✅ PASS |
| AC-04 | Update Action Taken | `API-04`, `UI-01`, `E2E-01` | ✅ PASS |
| AC-05 | Follow-up Validation on Update | `UT-01`, `API-05`, `UI-01` | ✅ PASS |
| AC-06 | Requester Read Actions (owned ticket) | `API-06`, `UI-01` | ✅ PASS |
| AC-07 | Requester Action Creation Blocked | `API-07`, `UI-01` | ✅ PASS |
| AC-08 | Independent Performer vs. Owner | `API-08`, `E2E-01` | ✅ PASS |
| AC-09 | Permitted Status Transitions | `UT-02`, `API-09`, `UI-02` | ✅ PASS |
| AC-10 | Invalid Status Transition Rejection | `UT-02`, `API-10` | ✅ PASS |
| AC-11 | Resolution Gate: Action Prerequisite | `UT-03`, `API-11`, `UI-02`, `E2E-02` | ✅ PASS |
| AC-12 | Resolution Gate: Summary Prerequisite | `UT-03`, `API-12`, `UI-02`, `E2E-02` | ✅ PASS |
| AC-13 | Requester Advisory Resolution | `API-14`, `E2E-02` | ✅ PASS |
| AC-14 | Optimistic Concurrency Detection | `API-15`, `UI-01` | ✅ PASS |
| AC-15 | Requester Dashboard Metrics | `API-16`, `UI-03`, `E2E-03` | ✅ PASS |
| AC-16 | Requester Dashboard Isolation | `API-17`, `UI-03` | ✅ PASS |
| AC-17 | IT Staff Dashboard Metrics | `API-18`, `UI-04`, `E2E-03` | ✅ PASS |
| AC-18 | Dashboard Drill-Down Navigation | `UI-04`, `E2E-03` | ✅ PASS |
| AC-19 | Administrator Dashboard Counters | `API-20` | ✅ PASS |
| AC-20 | Full System Regression | `REG-01` (`npm test`: 468 tests; E2E: 37 tests) | ✅ PASS |
| AC-21 | Empty State Dashboard Rendering | `UI-03`, `UI-04` | ✅ PASS |
| AC-22 | Responsive & Accessibility Polish | `E2E-01`, `E2E-02`, `E2E-03`; manual keyboard and viewport checks | ✅ PASS |

---

## 6. Release Pull Request (`lab4-staging` → `main`)

* **Release PR Link**: None found on GitHub at the time of this regression review.
* **Regression branch**: `feature/lab4-final-regression` (based on `lab4-staging`); it contains the existing `5038f91` commit plus uncommitted regression follow-up changes. No release PR was opened.
* **Release Checklist**:
  - [x] The seven Lab 4 PRs (#58, #67–#72) are merged into `lab4-staging`.
  - [x] Fresh-database migration and seed instructions were executed successfully.
  - [x] Final automated regression suites pass (server 297, client 171, E2E 37).
  - [x] Desktop, tablet, and mobile visual/accessibility inspection is complete and evidenced in `artifacts/lab-04/screenshots/`; keyboard focus was manually verified.
  - [ ] Final peer review and release approval are recorded.
  - [x] Lab 4 E2E coverage exists for E2E-01, E2E-02, and E2E-03.
* **Reviewer Sign-off**:
  * Final release reviewer: Not yet recorded.
  * Date: Pending final release review.
* **Accessibility scope note**: Keyboard focus behavior and responsive layouts were manually checked; no automated axe or screen-reader audit was run.
