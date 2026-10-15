# Lab 3 — Peer Review Record

## 1. Author and Reviewer Information

* **Author**: `Chetsada` — Student ID: `67070501080` — GitHub: `@JKNIGHTSX`
* **Peer Reviewer**: `Khanatip` — Student ID: `67070501008` — GitHub: `Khanatip112`
* **Target Integration Branch**: `lab3-staging`
* **Release Target Branch**: `main`

---

## 2. Pull Requests Authored (Reviewed by Peer Partner)

| PR # | Feature Branch | Target Branch | Scope Summary | Reviewer Verdict | Review Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PR #48 | `feature/lab3-specification` | `lab3-staging` | Lab 3 Sprint Specification, API Contract, UI Spec, and Test Plan | APPROVED | 2026-10-02 |
| PR #49 | `feature/lab3-user-migration` | `lab3-staging` | User database model, bcrypt password hashing, migration from RequesterUser to unified User model, seed data with roles | APPROVED | 2026-10-02 |
| PR #50 | `feature/lab3-Authentication` | `lab3-staging` | Login/Logout/Me/Change-Password API endpoints, express-session, mandatory first-login password change intercept, Login & ChangePassword UI components | APPROVED | 2026-10-03 |
| PR #51 | `feature/lab3-requester-regression` | `lab3-staging` | Requester authentication context replacement (removed X-Requester-Id header), ticket ownership enforcement, Lab 2 feature regression verification | APPROVED | 2026-10-04 |
| PR #52 | `feature/lab3-ITstaffticket` | `lab3-staging` | IT Staff shared Ticket Queue with search, filter, sort, pagination, desktop table and mobile card views | COMMENTED; merged, no approval event recorded | 2026-10-04 |
| PR #53 | `feature/lab3-ITstaffticketOp` | `lab3-staging` | IT Ticket Detail: Claim/Reassign, IT Priority, Status transitions, resolution summary, Public Comments & Internal Notes collaboration | APPROVED | 2026-10-05 |
| PR #54 | `feature/lab3-Detail` | `lab3-staging` | Staff Ticket Detail UI refinements, Public Comments (pale green) vs Internal Notes (amber) visual separation, comment/note API fixes | COMMENTED; merged, no approval event recorded | 2026-10-10 |
| PR #55 | `feature/lab3-User-Management` | `lab3-staging` | Administrator User Management console: user list, search, role filter, Create/Edit modals, initial password reset, self-deactivation & last-admin guardrails | APPROVED | 2026-10-12 |
| PR #56 | `feature/lab3-Responsive` | `lab3-staging` | Complete Testing & Responsive QA: E2E Playwright suites, responsive screenshots across 3 viewports, test defect fixes, final test pass verification | APPROVED | 2026-10-14 |

---

## 3. Recorded GitHub Review Events

### PR #48: Sprint Specification and Contracts
* **Review**: APPROVED by `Khanatip112` on 2026-10-02.
* **Comment**: "All .md look good JK"

### PR #49: User Database & Migration
* **Review**: APPROVED by `Khanatip112` on 2026-10-02.
* **Comment**: "Everything you modified and added looks great! Ready to merge"

### PR #50: Authentication & Password
* **Review**: APPROVED by `Khanatip112` on 2026-10-03.
* **Comment**: "Everything looks good with the system JK. Let's move forward!"

### PR #51: Requester Regression
* **Review**: APPROVED by `Khanatip112` on 2026-10-04.
* **Comment**: "Everything looks good, let's keep going JK"

### PR #52: IT Staff Ticket Queue
* **Review**: COMMENTED by `Khanatip112` on 2026-10-04; the PR was merged but no APPROVED review event is recorded.
* **Comment**: "Your code seems to have an error in App.tsx. Please double-check it kup JK"

### PR #53: IT Staff Ticket Operations
* **Review**: APPROVED by `Khanatip112` on 2026-10-05.
* **Comment**: "Everything looks good, JK. Go ahead if you have tokens left lol."

### PR #54: Detail View Fix
* **Review**: COMMENTED by `Khanatip112` on 2026-10-10; the PR was merged but no APPROVED review event is recorded.
* **Comment**: "Public Comment & Internal Note are solid, but 1 test is failing in tests/lab-02/create-ticket.api.test.ts. Could you check it out"

### PR #55: Administrator User Management
* **Review**: APPROVED by `Khanatip112` on 2026-10-12.
* **Comment**: "Great job JK, Everything looks good. Keep it up"

### PR #56: Complete Testing & Responsive QA
* **Review**: APPROVED by `Khanatip112` on 2026-10-14.
* **Comment**: "Awesome, JK Everything is working as expected"

---

## 4. Pull Requests Reviewed for Peer Partner

| PR | Branch | My Review Comment | Partner's Response | Final Verdict |
| :--- | :--- | :--- | :--- | :--- |
| [#28](https://github.com/Khanatip112/TokTickIT/pull/28) | `feature/1-contract-spec` | 2026-10-03 — "your works are ok let do next." | No response recorded | APPROVED |
| [#30](https://github.com/Khanatip112/TokTickIT/pull/30) | `feature/2-db-migration` | 2026-10-03 — "all change is work let go next." | No response recorded | APPROVED |
| [#32](https://github.com/Khanatip112/TokTickIT/pull/32) | `feature/3-auth-api` | 2026-10-04 — "Let go next this one is good." | 2026-10-04 — "Thank kup JK" | APPROVED |
| [#34](https://github.com/Khanatip112/TokTickIT/pull/34) | `feature/4-auth-ui` | 2026-10-04 — "It all good you are brillant." | 2026-10-04 — "OH Thank jk" | APPROVED |
| [#36](https://github.com/Khanatip112/TokTickIT/pull/36) | `feature/5-admin-user-management` | 2026-10-04 — "Aren't your token running out? Your work are work smooth as hell. Goodjob!" | 2026-10-04 — "I finally found a way, JK. Thanks for checking. Let's keep going!" | APPROVED |
| [#41](https://github.com/Khanatip112/TokTickIT/pull/41) | `feature/6-staff-ticket-queue` | 2026-10-04 — "Well well well I think you almost there na keep fighting." | 2026-10-04 — "Thanks for checking JK I'm starting to lose it lol" | APPROVED |
| [#42](https://github.com/Khanatip112/TokTickIT/pull/42) | `feature/7-staff-ticket-operations` | 2026-10-04 — "Amazing!!! It pass keep going." | 2026-10-04 — "We're almost there, JK. Let's keep going!" | APPROVED |
| [#43](https://github.com/Khanatip112/TokTickIT/pull/43) | `feature/8-comments-internal-notes` | 2026-10-04 — "This one is work let go almost there just a little to go." | 2026-10-04 — "Thanks JK! So close to finishing, let me know when to keep going!" | APPROVED |
| [#44](https://github.com/Khanatip112/TokTickIT/pull/44) | `feature/9-e2e-testing` | 2026-10-04 — "Approve! It the end for you just prepare the file to summit and done." | 2026-10-04 — "Finally done! But I still have to do the report lol" | APPROVED |

Only existing PRs in the requested #28–#44 range are listed; no partner response was recorded on PRs #28 or #30.

---

## 5. Release Pull Request (`lab3-staging` → `main`)

* **Release PR Link**: _(To be created after all feature branches merge into lab3-staging)_
* **Release Checklist**:
  - [x] All 9 feature PRs merged into `lab3-staging`.
  - [x] All automated unit, API, UI, and E2E tests pass from clean checkout.
  - [x] Zero database migration conflicts.
  - [x] Visual inspection confirmed on Desktop (≥992px), Tablet (768–991px), and Mobile (<768px).
  - [x] Final peer approval signed off.
* **Reviewer Sign-off**:
  * Reviewer Name: Khanatip
  * Date: 14/10/2026
