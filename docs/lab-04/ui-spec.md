# Lab 4 Zen Green UI Specification — TokTickIT

## 1. Design Philosophy & Design Tokens

The TokTickIT user interface extends the **Zen Green Design Language** from Labs 2 and 3 into Sprint 4. The UI emphasizes clarity, rapid operational decision-making, visual distinction between shared and role-specific workflows, calm surface contrast, and strict adherence to responsive and accessibility standards.

### 1.1. Color Tokens
| Token Name | Hex Value | Purpose & Visual Application |
| :--- | :--- | :--- |
| `color-primary-green` | `#006B3C` | App header, primary CTAs, active navigation indicators, key highlights. |
| `color-secondary-green` | `#0B7A46` | Interactive hover states, secondary action buttons, text links. |
| `color-pale-green` | `#EAF6EF` | Accent card backgrounds, `NEW` status badge, selected table rows. |
| `color-bg-page` | `#F5F7F6` | Calm near-white application canvas. |
| `color-surface-card` | `#FFFFFF` | Metric summary cards, tables, modal dialogs, drawers. |
| `color-border-subtle` | `#D1D9D4` | Dividers, card borders, neutral input field borders. |
| `color-text-primary` | `#1E2B24` | Primary body typography and headers with high contrast ratio (>= 7:1). |
| `color-text-muted` | `#556B60` | Secondary metadata, timestamps, card labels. |
| `color-amber-bg` | `#FFF8E1` | Internal notes container, `IN_PROGRESS` badge, follow-up required badge. |
| `color-amber-border` | `#FFE082` | Border accent for follow-up alerts and notes. |
| `color-amber-text` | `#B76E00` | Text color for follow-up warnings and in-progress status. |
| `color-error-bg` | `#FDF2F2` | Conflict alerts and validation error banners. |
| `color-error-text` | `#B3261E` | Destructive action text and validation failure copy. |

---

## 2. Global Navigation & Header Extensions

```text
+-----------------------------------------------------------------------------------------------+
| TokTickIT  [Dashboard]  [My Tickets / Ticket Queue]  [Create Ticket]   (Jennifer Anderson [Staff]) v|
+-----------------------------------------------------------------------------------------------+
```

* **Role-Appropriate Links**:
  * **Requester**: `Dashboard` (`/requester/dashboard`), `My Tickets` (`/tickets`), `Create Ticket` (`/tickets/new`).
  * **IT Staff**: `Dashboard` (`/staff/dashboard`), `Ticket Queue` (`/staff/queue`).
  * **Administrator**: `Dashboard` (`/admin/dashboard`), `Ticket Queue` (`/staff/queue`), `User Management` (`/admin/users`).
* **Active State**: The active navigation item displays a 3px solid `#006B3C` bottom border with bold text.

---

## 3. Screen Specifications & Layouts

### 3.1. IT Staff Dashboard (`/staff/dashboard`)

```text
+-----------------------------------------------------------------------------------------------+
| Welcome back, Michael!                                                             [ Refresh ]|
| Here's what's happening with your queue today.                                                |
|                                                                                               |
| +-------------+ +-------------+ +-------------+ +-------------+ +-------------+               |
| | New         | | Open        | | In Progress | | Waiting Req | | My Assigned |               |
| |     14      | |     23      | |     18      | |      7      | |     16      |               |
| |  View queue | |  View queue | |  View queue | |  View queue | |  View queue |               |
| +-------------+ +-------------+ +-------------+ +-------------+ +-------------+               |
|                                                                                               |
| +---------------------------------------------------+ +-------------------------------------+ |
| | My Recent Tickets                       [View all]| | Quick Actions                       | |
| |                                                   | |                                     | |
| | TKT-2026-000234   Laptop battery drains quickly   | |  [+] Create Ticket                  | |
| | [In Progress] [High]   Updated: Today 10:14 AM    | |                                     | |
| |                                                   | |  [Q] Search Tickets                 | |
| | TKT-2026-000189   Outlook freezing intermittently | |                                     | |
| | [Open] [Medium]        Updated: Today 09:22 AM    | |  [=] View Full Queue                | |
| +---------------------------------------------------+ +-------------------------------------+ |
+-----------------------------------------------------------------------------------------------+
```

* **Metric Cards Grid**:
  * 5 cards displayed in a responsive flex/grid (5 columns on desktop, 3 on tablet, 1-2 on mobile).
  * Each card shows: Metric Name, Large Bold Number (font size: 2.25rem), and a clickable drill-down button/link.
  * Clicking "New" opens `/staff/queue?status=NEW`.
  * Clicking "Open" opens `/staff/queue?status=OPEN`.
  * Clicking "In Progress" opens `/staff/queue?status=IN_PROGRESS`.
  * Clicking "Waiting Req" opens `/staff/queue?status=WAITING_FOR_REQUESTER`.
  * Clicking "My Assigned" opens `/staff/queue?assigned=ME`.
* **Recent Tickets Panel**:
  * Shows up to 5 tickets with Ticket Number, Summary, Status Badge, Priority Badge, and Relative/Absolute Timestamp.
  * Clicking any ticket navigates directly to its Ticket Detail view (`/staff/tickets/:id`).
* **Empty State**: If zero tickets exist in recent queue, displays a calm Zen Green illustration card: "Queue is clear. No active tickets require immediate triage."

---

### 3.2. Requester Dashboard (`/requester/dashboard`)

```text
+-----------------------------------------------------------------------------------------------+
| Welcome, Jennifer!                                                                            |
| Here's the latest on your support requests.                                                   |
|                                                                                               |
| +-------------+ +-------------+ +-------------+ +-------------+                               |
| | Open        | | In Progress | | Resolved    | | Closed      |                               |
| |      3      | |      2      | |      5      | |     12      |                               |
| |  View all   | |  View all   | |  View all   | |  View all   |                               |
| +-------------+ +-------------+ +-------------+ +-------------+                               |
|                                                                                               |
| +---------------------------------------------------+ +-------------------------------------+ |
| | My Recent Tickets                       [View all]| | Quick Actions                       | |
| |                                                   | |                                     | |
| | TKT-2026-000234   Laptop battery drains quickly   | |  [+] Submit New Ticket              | |
| | [In Progress]          Updated: Today 10:14 AM    | |                                     | |
| |                                                   | |  [=] View All My Tickets            | |
| | TKT-2026-000222   Request software access         | |                                     | |
| | [Resolved]             Updated: Yesterday 2:30 PM | |                                     | |
| +---------------------------------------------------+ +-------------------------------------+ |
+-----------------------------------------------------------------------------------------------+
```

* **Metric Cards Grid**:
  * 4 cards: `Open`, `In Progress`, `Resolved`, `Closed`.
  * Drill-down: Clicking any card navigates to `/tickets` filtered by that status.
* **Security & Data Isolation**:
  * All counts and recent ticket listings strictly filter by `requesterId == currentUser.id`.

---

### 3.3. Actions Taken Section on Ticket Detail (`/staff/tickets/:id` & `/tickets/:id`)

```text
+-----------------------------------------------------------------------------------------------+
| [Actions Taken] (3)                                                  [+ Record Action Taken]  |
|-----------------------------------------------------------------------------------------------|
| Date & Time        Action & Performer                     Result / Follow-Up        Actions   |
|-----------------------------------------------------------------------------------------------|
| 2026-10-21 10:30   Replaced swollen battery pack          Laptop boots normally.    [ Edit ]  |
|                    By: Michael Brown [IT Staff]           [!] Follow-up Required:             |
|                    Attachment: Asset tag 55829.           Monitor charge 24h.                 |
|-----------------------------------------------------------------------------------------------|
| 2026-10-21 09:15   Run battery diagnostics report         Degraded cell #2 found.   [ Edit ]  |
|                    By: Sarah Johnson [IT Staff]           No follow-up required.              |
+-----------------------------------------------------------------------------------------------+
```

* **Desktop View**: Clean tabular data grid with column headers: Action Date/Time, Description & Performer, Result & Follow-up, Controls.
* **Mobile View (<768px)**: Cards stacked vertically with distinct badges for `[!] Follow-up Required` (amber background) and Performer badge.
* **Requester View**:
  * Requesters can see all Actions Taken items, including date, description, result, performer, and follow-up notes.
  * The `[+ Record Action Taken]` and `[ Edit ]` action buttons are omitted for Requesters.

---

### 3.4. Create / Edit Action Taken Modal / Drawer

```text
+-----------------------------------------------------------------------+
| Record Action Taken                                               [X] |
|-----------------------------------------------------------------------|
| Action Date & Time *                                                  |
| [ 2026-10-21T10:30                                                  ] |
|                                                                       |
| Performed By                                                          |
| [ Michael Brown (IT Staff) - Auto-assigned                          ] |
|                                                                       |
| Action Description *                                                  |
| [ Replaced swollen battery pack with OEM Part #BAT-992...           ] |
|                                                                       |
| Result *                                                              |
| [ Laptop boots normally on battery power. Diagnostics 100%...        ] |
|                                                                       |
| [X] Follow-Up Required?                                               |
|                                                                       |
| Follow-Up Note * (Required when follow-up is requested)               |
| [ Monitor battery charging cycle over next 24 hours.                ] |
|                                                                       |
| Attachment Notes (Optional: Physical media / external logs)           |
| [ Hardware serial logged on inventory asset tag 55829.              ] |
|                                                                       |
| --------------------------------------------------------------------- |
| [ Cancel ]                                         [ Save Action ]    |
+-----------------------------------------------------------------------+
```

* **Form Logic & Accessibility**:
  * When `Follow-Up Required` checkbox is checked, the `Follow-Up Note` field smoothly expands and is marked required (`aria-required="true"`).
  * If unchecked, `Follow-Up Note` is disabled/hidden and cleared.
  * `Save Action` button shows a loading spinner during network transmission and disables to prevent double-click submissions.
  * In Edit mode, if a conflict is detected (HTTP 409), a prominent error banner appears: "This record has been updated by another user. Please reload the latest data." Form inputs are preserved.

---

### 3.5. Ticket Status Transition Controls & Resolution Gate Feedback

```text
+-----------------------------------------------------------------------------------------------+
| Status: [ IN_PROGRESS ]                                                                       |
| Allowed Transitions: [ Set Waiting for Requester ]  [ Resolve Ticket ]  [ Cancel Ticket ]     |
+-----------------------------------------------------------------------------------------------+
```

* **Resolve Ticket Action**:
  * Clicking `[ Resolve Ticket ]` opens the Resolution Modal requesting `Resolution Summary *`.
  * If the ticket has 0 Actions Taken, the button is either disabled with a tooltip or clicking it displays a clear modal warning:
    > "Resolution Gate Blocked: At least one Action Taken must be recorded before resolving this ticket. Please record the actions taken first."
  * Submitting without at least 5 characters in `resolutionSummary` displays inline validation: "Resolution summary must be at least 5 characters."

---

## 4. Responsive Breakpoints & Accessibility Standards

### 4.1. Breakpoint Grid
* **Desktop (≥992px)**: Full multi-column dashboard grid (4–5 metric cards), full tabular Actions Taken view, multi-column forms.
* **Tablet (768px – 991px)**: 2–3 column metric cards, compressed table layout with horizontal scrolling container for tables, responsive modal drawers.
* **Mobile (<768px)**: 1–2 column metric cards, stacked card representation for Actions Taken, full-screen mobile modal dialogs, bottom-sheet style buttons.

### 4.2. Accessibility Standards
* **WCAG 2.1 AA Compliance**:
  * High contrast ratios on all text (minimum 4.5:1 for body copy, 3:1 for large headers).
  * Keyboard navigation: All interactive buttons, metric cards, and modals are accessible via `Tab`, `Enter`, `Space`, and `Escape`.
  * Screen reader support: ARIA roles (`role="region"`, `role="dialog"`, `aria-live="polite"` for metric updates and error banners).
  * Visible focus rings: 2px solid `#006B3C` with 2px offset on all focused elements.
