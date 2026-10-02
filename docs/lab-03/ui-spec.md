# Lab 3 Zen Green UI Specification — TokTickIT

## 1. Design Philosophy & Zen Green Theme

The TokTickIT user interface extends the **Zen Green Design Language** introduced in Lab 2. It maintains a calm aesthetic, clear visual hierarchy, distinct read-only versus editable field styling, explicit role badges, and accessible responsive behavior across desktop, tablet, and mobile viewports.

---

## 2. Design Tokens & Color Palette

### 2.1. Color Tokens
| Token Name | Hex Value | Semantic Purpose & Usage |
| :--- | :--- | :--- |
| `color-primary-green` | `#006B3C` | App header background, primary action buttons, active tab indicator. |
| `color-secondary-green` | `#0B7A46` | Interactive hover states, text links, focused border accents. |
| `color-pale-green` | `#EAF6EF` | Selected row fill, Public Comment container background, `NEW`/`OPEN` badge background. |
| `color-bg-page` | `#F5F7F6` | Calm near-white application canvas background. |
| `color-surface-card` | `#FFFFFF` | Form containers, data tables, modal dialogs, card components. |
| `color-border-subtle` | `#D1D9D4` | Card outlines, table borders, neutral input field outlines. |
| `color-text-primary` | `#1E2B24` | High-contrast dark charcoal-green for primary headings and body copy. |
| `color-text-muted` | `#556B60` | Secondary metadata, labels, table headers, timestamp descriptions. |
| `color-read-only-bg` | `#F0F4F1` | Background fill for non-editable system-generated fields. |
| `color-amber-notes-bg` | `#FFF8E1` | **Internal Notes** container background (visually distinct private note fill). |
| `color-amber-notes-border`| `#FFE082` | Internal Notes border accent. |
| `color-amber-notes-text` | `#795548` | Internal Notes author header text. |
| `color-error-text` | `#B3261E` | Validation error text, destructive action buttons, error alerts. |
| `color-error-bg` | `#FDF2F2` | Validation error banner fill and invalid input background. |
| `color-role-admin` | `#673AB7` | Purple badge fill for `Administrator` role. |
| `color-role-staff` | `#0288D1` | Blue badge fill for `IT Staff` role. |
| `color-role-requester` | `#388E3C` | Green badge fill for `Requester` role. |

### 2.2. Component Badge Schemes
* **Role Badges**:
  * `Requester`: Green badge (`#E8F5E9` bg, `#2E7D32` text)
  * `IT Staff`: Blue badge (`#E1F5FE` bg, `#0277BD` text)
  * `Administrator`: Purple badge (`#EDE7F6` bg, `#512DA8` text)
* **Ticket Status Badges**:
  * `NEW`: Pale green (`#EAF6EF` bg, `#006B3C` text)
  * `OPEN`: Light blue (`#E3F2FD` bg, `#1565C0` text)
  * `IN_PROGRESS`: Amber tint (`#FFF8E1` bg, `#B76E00` text)
  * `WAITING_FOR_REQUESTER`: Purple tint (`#F3E5F5` bg, `#7B1FA2` text)
  * `RESOLVED`: Success green (`#E8F5E9` bg, `#2E7D32` text)
  * `CLOSED`: Neutral gray (`#ECEFF1` bg, `#455A64` text)
  * `REOPENED`: Warning orange (`#FBE9E7` bg, `#D84315` text)
  * `CANCELLED`: Light red (`#FFEBEE` bg, `#C62828` text)

---

## 3. Application Shell & Navigation

```text
+-----------------------------------------------------------------------------------------+
| TokTickIT  [My Queue / My Tickets] [Create Ticket]         (Michael Brown [IT Staff]) v |
|                                                            [ Profile ] [ Logout ]       |
+-----------------------------------------------------------------------------------------+
```

* **Header Left**: Application logo (`TokTickIT`) and role-specific navigation links.
  * `Requester`: "My Tickets", "Create Ticket"
  * `IT Staff`: "Ticket Queue"
  * `Administrator`: "User Management"
* **Header Right**: Authenticated user badge (`User Name`, `Role Badge`), dropdown menu with profile details and a clear `Logout` button.
* **Removal**: The Lab 2 Development Requester selector dropdown is completely removed.

---

## 4. Required Screens & Interfaces

### 4.1. Login Screen (`/login`)

```text
+-------------------------------------------------------------+
|                          TokTickIT                          |
|                                                             |
| Sign in to your account                                     |
| Email address *                                             |
| [ janderson@toktickit.com                                 ] |
| Password *                                                  |
| [ ************                                         (o) ] |
|                                                             |
| [ (i) Invalid email or password. Please try again.        ] |
|                                                             |
| [                        Sign In                          ] |
+-------------------------------------------------------------+
```

* **Elements**:
  * Email input with client-side format validation.
  * Password input with show/hide toggle icon `(o)`.
  * Primary green `Sign In` button with loading spinner state.
  * Error alert banner for invalid credentials or inactive account.

---

### 4.2. Mandatory First-Login Password Change Screen (`/change-password`)

```text
+-------------------------------------------------------------+
| Change Your Password                                        |
| You must change your initial password to continue.          |
|                                                             |
| Current (temporary) password *                              |
| [ *******                                               (o) ] |
| New password *                                              |
| [ ***********                                           (o) ] |
| Confirm new password *                                      |
| [ ***********                                           (o) ] |
|                                                             |
| Password rules:                                             |
| [v] Be at least 8 characters                                |
| [v] Include upper and lower case letters                    |
| [v] Include a number and a special character                |
|                                                             |
| [                        Continue                         ] |
+-------------------------------------------------------------+
```

* **Behavior**: Intercepts users with `mustChangePassword = true`.
* **Validation**:
  * Live password strength checklist.
  * Match verification between New Password and Confirm New Password.
  * Disables `Continue` button until all rules pass.

---

### 4.3. IT Staff Ticket Queue Screen (`/staff/queue`)

```text
+--------------------------------------------------------------------------------------------------+
| Ticket Queue                                                                     [+ Create Ticket] |
|                                                                                                  |
| [ Q Search by ticket number or summary...                     ] [ Filter By Category v ] [ Filters ]|
| Showing 1 to 10 of 87 tickets                                                                    |
| +----------------------------------------------------------------------------------------------+ |
| | Ticket No ^ | Created Date | Summary           | Category | Req. Prio | IT Prio | Status | Owner |
| |-------------|--------------|-------------------|----------|-----------|---------|--------|-------|
| | TKT-001234  | May 12, 09:14| Battery draining  | Hardware | Medium    | Medium  | IN_PROG| M.Brown|
| | TKT-001233  | May 12, 08:02| Cannot connect VPN| Network  | High      | High    | OPEN   | S.John|
| +----------------------------------------------------------------------------------------------+ |
|                                [ < Previous ] [1] 2 3 4 5 ... 9 [ Next > ]                       |
+--------------------------------------------------------------------------------------------------+
```

* **Desktop View**: Full responsive data grid with sortable columns, status badges, priority badges, and owner badges.
* **Mobile View (<768px)**: Stacked card format displaying Ticket Number, Summary, Priority chips, Status chip, Owner, and "View Detail" button.
* **Filter Controls**: Text search bar, Category picker, IT Priority picker, Status picker, Assignment filter (`Unassigned`, `Assigned to Me`, `All`).

---

### 4.4. IT Staff Ticket Detail Screen (`/staff/tickets/:id`)

```text
+--------------------------------------------------------------------------------------------------+
| My Queue > Ticket Detail                                                      [ <- Back to Queue ]|
|                                                                                                  |
| Ticket No            Category                 Related System                                     |
| [ TKT-2025-001234  ] [ Hardware             ] [ Corporate Laptop                             ] |
| Requester            Requested Priority       Current Status                                     |
| [ Jennifer Anderson] [ Medium               ] [ IN_PROGRESS                                ] |
| Ticket Owner         IT Priority                                                                 |
| [ Michael Brown (IT)v] [ Medium            v]                                                   |
|                                                                                                  |
| Summary: Laptop battery drains quickly                                                           |
| Description: My laptop battery is draining much faster than usual even when idle...              |
|                                                                                                  |
| [ Public Comments (3) ] [ Internal Notes (2) ] [ Attachments (2) ] [ Service Actions (1) ]       |
| +----------------------------------------------------------------------------------------------+ |
| | Add Public Comment                                                                           | |
| | [ Type your comment here...                                                                ] | |
| |                                                                     [ Post Comment ]         | |
| |                                                                                              | |
| | (JA) Jennifer Anderson [Requester]                              May 13, 2025 11:45 AM        | |
| |      Thank you for the update. Please let me know if you need additional info.               | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

* **Editable Controls**:
  * `Ticket Owner`: Dropdown selector to claim or reassign ticket.
  * `IT Priority`: Dropdown selector (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * `Status Action Bar`: Context-sensitive buttons (`Begin Work`, `Request Info`, `Resolve Ticket`, `Close Ticket`, `Cancel Ticket`).
* **Comments & Notes Tab Layout**:
  * **Public Comments Tab**: Light green background cards (`#EAF6EF`). Visible to Requester, IT Staff, and Admin.
  * **Internal Notes Tab**: Distinct amber/brown background cards (`#FFF8E1`) with lock icon and warning header: `🔒 Internal Notes are visible only to IT Staff and Administrators`.

---

### 4.5. Administrator User Management Screen (`/admin/users`)

```text
+--------------------------------------------------------------------------------------------------+
| Users                                                                            [+ Create User] |
|                                                                                                  |
| [ Q Search users...                                           ] [ All Roles v ]                 |
| +----------------------------------------------------------------------------------------------+ |
| | Name              | Email                          | Role          | Status   | Actions      | |
| |-------------------|--------------------------------|---------------|----------|--------------| |
| | Jennifer Anderson | jennifer.anderson@toktickit.com| [ Requester ] | [Active ]| [ Edit ]     | |
| | Michael Brown     | tech1@toktickit.com            | [ IT Staff  ] | [Active ]| [ Edit ]     | |
| | John Smith        | admin@toktickit.com            | [ Admin     ] | [Active ]| [ Edit ]     | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

#### Create / Edit User Drawer (Modal):
```text
+-------------------------------------------------------------+
| Create New User                                         (X) |
| Full Name *                                                 |
| [ Alex Thompson                                           ] |
| Email Address *                                             |
| [ alex.thompson@toktickit.com                             ] |
| Role *                                                      |
| [ IT Staff                                                v ] |
| Active Status                                               |
| (x) Active  ( ) Inactive                                    |
| Initial Password *                                          |
| [ TempPass123!                                            ] |
| [x] User must change password on first login                |
|                                                             |
| [ Cancel ]                                    [ Save User ] |
+-------------------------------------------------------------+
```

* **Guardrail Feedback**:
  * Attempting to deactivate own account shows warning banner: `⚠️ You cannot deactivate your active Administrator account.`
  * Attempting to deactivate the last active Admin displays: `⚠️ Action blocked: At least one active Administrator must remain.`

---

## 5. Screen Modes and State Feedback

* **Loading State**: Zen Green skeleton loaders for tables, cards, and detail view panels.
* **Saving / Processing State**: Action buttons display animated inline spinner and text `Saving...` / `Processing...`.
* **Empty State (Zero Records)**:
  * Queue: "No tickets found in the queue."
  * Users: "No user accounts created yet."
* **No-Results State (Filters Matched 0)**:
  * "No tickets match your search or filter criteria. Try clearing filters."
* **Forbidden State (403)**:
  * Full page Zen Green access denied card: `🔒 Access Restricted. You do not have permission to view this resource.`

---

## 6. Responsive & Accessibility Rules

* **Breakpoints**: Desktop (`>= 992px`), Tablet (`768px – 991px`), Mobile (`< 768px`).
* **Touch Targets**: All buttons, select controls, and tab items have minimum `44px x 44px` clickable area on touch devices.
* **Focus States**: All interactive elements feature high-contrast `2px` green focus rings (`#006B3C`).
* **Text Contrast**: WCAG AA compliant contrast ratio (minimum `4.5:1`) for body text and badges against background surfaces.
