# Lab 4 — Peer Review Record

## 1. Author and Reviewer Information

* **Author**: `Chetsada` — Student ID: `67070501080` — GitHub: `@JKNIGHTSX`
* **Peer Reviewer**: `Khanatip` — Student ID: `67070501008` — GitHub: `Khanatip112`
* **Target Integration Branch**: `lab4-staging`
* **Release Target Branch**: `main`

---

## 2. Pull Requests Authored (Reviewed by Peer Partner)

| PR | Feature Branch | Target Branch | Partner Review Comment | My Follow-up / Response | Final Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [#58](https://github.com/JKNIGHTSX/toktickit/pull/58) | `feature/lab4-spec-and-tests` | `lab4-staging` | 2026-10-22 — "All files are okay. Anyway, are you going to study for the exam" | No fixes required; continued with the sprint plan and moved to next issue. | APPROVED |
| [#67](https://github.com/JKNIGHTSX/toktickit/pull/67) | `feature/lab4-actions-taken-api` | `lab4-staging` | 2026-10-31 — "Regression test failure in tests/lab-01/App.test.tsx (2 failed tests)" | Fixed the Lab 1 regression issue, re-ran the affected tests, and re-submitted the patch before approval. | APPROVED |
| [#68](https://github.com/JKNIGHTSX/toktickit/pull/68) | `feature/lab4-actions-ui` | `lab4-staging` | 2026-11-01 — "Action taken looks good. Keep it up, JK" | No code changes needed; UI implementation matched the acceptance criteria. | APPROVED |
| [#69](https://github.com/JKNIGHTSX/toktickit/pull/69) | `feature/lab4-ticket-workflow` | `lab4-staging` | 2026-11-01 — "Fixes failing test cases in the server . While most tests passed successfully, some cases failed." | Corrected the failing server-side test cases, verified the workflow behavior, and updated the patch before re-review. | APPROVED |
| [#70](https://github.com/JKNIGHTSX/toktickit/pull/70) | `feature/lab4-staff-dashboard-api` | `lab4-staging` | 2026-11-02 — "okay jk, staff dashboard api look good," | No follow-up changes required; merged after review confirmation. | APPROVED |
| [#71](https://github.com/JKNIGHTSX/toktickit/pull/71) | `feature/lab4-requester-dashboard-api` | `lab4-staging` | 2026-11-03 — "Requester dashboard api look good, Let go JK" | No further fixes required; proceeded to the next Lab 4 deliverable. | APPROVED |
| [#72](https://github.com/JKNIGHTSX/toktickit/pull/72) | `feature/lab4-rolebase-UI` | `lab4-staging` | 2026-11-06 — "Whenever I click on any navigation item (like Status: New, Open), it displays all items instead of filtering/sorting by the selected option." | Fixed the drill-down filter logic so the dashboard items correctly respect the selected status and re-ran the UI verification before final approval. | APPROVED |

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
| [#48](https://github.com/Khanatip112/TokTickIT/pull/48) | `feature/lab4-spec-and-tests` | 2026-10-19 — "Nice Start!" | 2026-10-19 — "Haha okay JK" | APPROVED |
| [#55](https://github.com/Khanatip112/TokTickIT/pull/55) | `feature/lab4-db-migration` | 2026-10-19 — "Approve good to go you can merge it." | 2026-10-19 — "Thank JK, anyway, how's the reading going, JK lol" | APPROVED |
| [#57](https://github.com/Khanatip112/TokTickIT/pull/57) | `feature/lab4-actions-api` | 2026-10-19 — "It look good. NEXT!" | 2026-10-19 — "Thanks, JK I was worried about running out of tokens, so I rushed it." | APPROVED |
| [#58](https://github.com/Khanatip112/TokTickIT/pull/58) | `feature/lab4-actions-ui` | 2026-10-29 — "It work well you can do the next issue." | 2026-10-29 — "Thanks for checking it. Let's keep rolling" | APPROVED |
| [#59](https://github.com/Khanatip112/TokTickIT/pull/59) | `feature/lab4-ticket-workflow` | 2026-10-31 — "Nice Fix." | 2026-10-31 — "My mistake was not checking the 'action taken' for tickets with a 'new' status. lol" | APPROVED |
| [#60](https://github.com/Khanatip112/TokTickIT/pull/60) | `feature/lab4-requester-dashboard-api` | 2026-10-31 — "You nail it.Your can merge it now." | 2026-10-31 — "thanks for check JK" | APPROVED |
| [#61](https://github.com/Khanatip112/TokTickIT/pull/61) | `feature/lab4-staff-dashboard-api` | 2026-11-01 — "Nice work Khanatip." | 2026-11-01 — "Thank for check jk." | APPROVED |
| [#62](https://github.com/Khanatip112/TokTickIT/pull/62) | `feature/lab4-e2e-tests` | 2026-11-01 — "APPROVE! You have done it all." | 2026-11-01 — "Thanks a lot for checking it for me, JK It’s finally done, but I still have to do the report TT" | APPROVED |

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
