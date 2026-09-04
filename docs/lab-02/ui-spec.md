# Lab 2 Zen Green UI Specification — TokTickIT

## 1. Design Philosophy & Zen Green Theme

The TokTickIT user interface uses the **Zen Green Design Language**, engineered for calm readability, clean visual hierarchy, clear component state feedback, and responsive accessibility across all device viewports.

---

## 2. Design Tokens & Color Palette

### 2.1. Color Tokens
| Token Name | Hex Value | Semantic Purpose & Usage |
| :--- | :--- | :--- |
| `color-primary-green` | `#006B3C` | App navigation header background, primary action buttons, focused tab underline, strong emphasis. |
| `color-secondary-green` | `#0B7A46` | Interactive hover states, active filter chips, focused form border accents, text links. |
| `color-pale-green` | `#EAF6EF` | Selected table row background, success callout banners, `NEW` status badge background. |
| `color-bg-page` | `#F5F7F6` | Calm near-white application canvas background. |
| `color-surface-card` | `#FFFFFF` | Form cards, data tables, modals, and panel backgrounds. |
| `color-border-subtle` | `#D1D9D4` | Card outlines, table divider lines, and neutral field borders. |
| `color-text-primary` | `#1E2B24` | High-contrast dark charcoal-green for headings and primary body copy. |
| `color-text-muted` | `#556B60` | Secondary metadata, labels, table headers, and timestamp descriptions. |
| `color-read-only-bg` | `#F0F4F1` | Background fill for non-editable system-generated fields (distinct from white editable fields). |
| `color-error-text` | `#B3261E` | Validation error text, destructive action buttons, and error alert banners. |
| `color-error-bg` | `#FDF2F2` | Validation error callout and invalid input light fill. |
| `color-warning-amber` | `#B76E00` | High/Urgent priority badges, warning callouts (not for general decoration). |
| `color-warning-bg` | `#FFF8E1` | Background tint for warning and medium/high priority badges. |
| `color-success-text` | `#006B3C` | Confirmation banners, resolved badge text. |
| `color-success-bg` | `#EAF6EF` | Confirmation container background. |

### 2.2. Typography
* **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
* **Hierarchy**:
  * `H1` (Page Title): `24px` (`1.5rem`), font-weight `700`, line-height `1.25`, color `#1E2B24`
  * `H2` (Section Heading): `18px` (`1.125rem`), font-weight `600`, line-height `1.3`, color `#1E2B24`
  * `H3` (Card / Sub-section): `15px` (`0.9375rem`), font-weight `600`, line-height `1.4`, color `#1E2B24`
  * `Body Text`: `14px` (`0.875rem`), font-weight `400`, line-height `1.5`, color `#1E2B24`
  * `Small / Caption`: `12px` (`0.75rem`), font-weight `400`, line-height `1.4`, color `#556B60`
  * `Form Label`: `13px` (`0.8125rem`), font-weight `600`, line-height `1.2`, color `#1E2B24`

### 2.3. Spacing Scale
* `space-1`: `4px`
* `space-2`: `8px`
* `space-3`: `12px`
* `space-4`: `16px`
* `space-5`: `24px`
* `space-6`: `32px`

---

## 3. Reusable Component Rules & States

### 3.1. Form Controls

```
+-------------------------------------------------------------------------+
| Field Label *                                                          |
| +---------------------------------------------------------------------+ |
| | Input content goes here                                              | |
| +---------------------------------------------------------------------+ |
| Validation error message appears here in dark red                      |
+-------------------------------------------------------------------------+
```

* **Labels**: Rendered directly above the control, font-weight `600`, color `#1E2B24`.
* **Required Indicator**: Required fields show a distinct red asterisk (`<span className="text-danger" aria-hidden="true">*</span>`).
* **Editable Fields**:
  * Normal: Background `#FFFFFF`, 1px border `#D1D9D4`, border-radius `6px`, padding `8px 12px`, min-height `40px`.
  * Focused: Border `#0B7A46`, box-shadow `0 0 0 3px rgba(11, 122, 70, 0.15)`, outline none.
  * Invalid: Border `#B3261E`, box-shadow `0 0 0 3px rgba(179, 38, 30, 0.15)`. Error message rendered immediately below in `#B3261E` (`12px`).
* **Read-Only / Disabled Fields**:
  * Background `#F0F4F1` (soft gray-green/warm ivory shading), border `1px solid #D1D9D4`, text `#556B60`, cursor `not-allowed` or default. Visually distinct from editable inputs to prevent confusion.
* **Multiline Description**: Taller textarea (`min-height: 120px`), vertical resize only, does not break grid layout.

### 3.2. Button Hierarchy & States
* **Primary Button** (e.g. "Submit Ticket", "Continue", "+ Create Ticket"):
  * Normal: Background `#006B3C`, text `#FFFFFF`, font-weight `600`, border-radius `6px`, padding `8px 16px`.
  * Hover/Active: Background `#0B7A46`.
  * Busy / Submitting: Background `#006B3C`, opacity `0.75`, cursor `wait`, displays inline loading spinner with text "Submitting…", disabled.
  * Disabled: Background `#A3C2B3`, text `#FFFFFF`, cursor `not-allowed`.
* **Secondary / Outline Button** (e.g. "Cancel", "Clear Filters", "Back to My Tickets"):
  * Normal: Background `#FFFFFF`, border `1px solid #D1D9D4`, text `#1E2B24`.
  * Hover: Background `#EAF6EF`, border-color `#0B7A46`, text `#0B7A46`.
* **Destructive Button** (e.g. "Remove Attachment"):
  * Normal: Background `#FFFFFF`, border `1px solid #B3261E`, text `#B3261E`.
  * Hover: Background `#FDF2F2`, text `#900000`.
* **Icon-Only Controls**: Must include `aria-label`, visible tooltip on focus/hover, and touch target >= `40px x 40px`.

### 3.3. Priority & Status Badges
Badges use distinct background/text combinations and non-color cues (text + shape):

* **Requested / IT Priority Badges**:
  * `LOW`: Background `#E8F5E9`, text `#2E7D32`, border `1px solid #C8E6C9`
  * `MEDIUM`: Background `#FFF8E1`, text `#B78103`, border `1px solid #FFE082`
  * `HIGH`: Background `#FBE9E7`, text `#D84315`, border `1px solid #FFCCBC`
  * `URGENT`: Background `#FFEBEE`, text `#C62828`, border `1px solid #FFCDD2`
* **Status Badges**:
  * `NEW`: Background `#EAF6EF`, text `#006B3C`, border `1px solid #A3D9B8`
  * `OPEN`: Background `#E3F2FD`, text `#1565C0`, border `1px solid #BBDEFB`
  * `IN_PROGRESS`: Background `#E8F5E9`, text `#2E7D32`, border `1px solid #C8E6C9`
  * `RESOLVED`: Background `#ECEFF1`, text `#455A64`, border `1px solid #CFD8DC`
  * `CLOSED`: Background `#F5F5F5`, text `#616161`, border `1px solid #E0E0E0`
  * `CANCELLED`: Background `#FFEBEE`, text `#C62828`, border `1px solid #FFCDD2`

---

## 4. Application Navigation & Shell

```
+-----------------------------------------------------------------------------------+
| (v) TokTickIT     [ My Tickets ]   [ + Create Ticket ]       [ (o) Jennifer Anderson v ] |
+-----------------------------------------------------------------------------------+
```

1. **Top Navigation Bar**:
   * Fixed/Sticky at top, background `#006B3C`, text `#FFFFFF`, height `60px`, padding `0 24px`.
   * Left: TokTickIT Logo + Title (`font-weight: 700`, `18px`).
   * Center/Left: Navigation links:
     * `My Tickets` (`/tickets`): Underlined in `#EAF6EF` with `font-weight: 600` when active.
     * `Create Ticket` (`/tickets/new`): With a `+` icon badge.
   * Right: Active Requester Context Badge:
     * Avatar circle with initials (e.g. `JA`), Requester Name (`Jennifer Anderson`), and "Change Requester" dropdown trigger.
2. **Requester Switcher Action**:
   * Clicking "Change Requester" opens a dropdown/modal allowing the user to select another active Requester or returns to the Requester Selection Screen.

---

## 5. Screen Layouts & Detailed Specifications

### 5.1. Screen 1: Development Requester Selection Screen (`/requester-select`)

```
+-----------------------------------------------------------------------+
|                             [Icon / Avatar]                           |
|                       Select Development Requester                    |
|       Choose a development requester to simulate the current context  |
|               This is for testing only and is not a login screen.     |
|                                                                       |
|  Development Requester *                                              |
|  [ Jennifer Anderson (Marketing)                                    v ] |
|                                                                       |
|  (i) Only active development requesters are shown.                    |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | [Shield] Authentication coming in Lab 3                        |  |
|  | In Lab 3, this selection will be replaced with secure auth.     |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|                              [ Cancel ]      [ -> Continue ]          |
+-----------------------------------------------------------------------+
```

* **Layout**: Centered card (max-width `520px`) on `#F5F7F6` canvas.
* **Elements**:
  * Header icon and title "Select Development Requester".
  * Clarification callout explaining this is a Lab 2 testing mechanism.
  * Dropdown select showing active Requesters formatted: `Name (Department)`.
  * Info note: "Only active development requesters are shown."
  * Lab 3 roadmap reminder box in pale green `#EAF6EF`.
  * Actions: "Cancel" (resets to previous) and "Continue" (saves selection and navigates to `/tickets`).
* **States**:
  * *Loading*: Spinner rendered while fetching `/api/requesters`.
  * *Empty*: Warning banner if 0 active requesters exist ("No active requesters found in database").
  * *API Error*: Error alert if endpoint fails with "Retry" button.

---

### 5.2. Screen 2: Create Ticket Screen (`/tickets/new`)

```
+-----------------------------------------------------------------------------------+
| My Tickets > Create Ticket                                                        |
|                                                                                   |
| +-- Ticket Information Card ----------------------------------------------------+ |
| | Ticket No: [ TKT-Pending ]      Ticket Date: [ May 12, 2026 09:14 AM (Read-only) ] |
| | Requester: [ Jennifer Anderson (Read-only) ]                                    |
| |                                                                               | |
| | Category *                      Related System *            Priority *        | |
| | [ Hardware                   v] [ Corporate Laptop       v] [ Medium        v] | |
| |                                                                               | |
| | Ticket Summary * (5-150 characters)                                           | |
| | [ Laptop battery drains quickly                                             ] | |
| | 31 / 150 characters                                                           | |
| |                                                                               | |
| | Description * (10-2000 characters)                                            | |
| | [ My laptop battery is draining much faster than usual even when idle...   ] | |
| | [                                                                           ] | |
| |                                                                               | |
| | Supporting Attachments (Optional - Max 5 files, <=5MB each, JPG/PNG/WEBP/PDF) | |
| | +---------------------------------------------------------------------------+ | |
| | | [Upload Icon] Drag & drop files here, or [Browse Files]                   | | |
| | +---------------------------------------------------------------------------+ | |
| | Selected Files:                                                               | |
| | * battery_log.pdf (240 KB) [ x Remove ]                                      | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
|                                   [ Cancel ]   [ Submit Ticket (Primary Green) ]  |
+-----------------------------------------------------------------------------------+
```

* **Layout**: Centered card container (max-width `860px`).
* **Field Organization**:
  1. *Top System Row (Read-Only)*:
     * Ticket No: Displays `Pending Generation` with `#F0F4F1` background.
     * Ticket Date: Formatted current timestamp (`#F0F4F1` background).
     * Requester: Active Requester name (`#F0F4F1` background).
  2. *Classification Row (Editable 3-Column Grid on Desktop)*:
     * Category dropdown (Required `*`).
     * Related System dropdown (Required `*`).
     * Requested Priority dropdown (Required `*`, default `MEDIUM`).
  3. *Content Section*:
     * Ticket Summary input with real-time character counter (e.g. `31/150`).
     * Description multiline textarea (min-height `130px`, max 2000 chars).
  4. *Attachments Section*:
     * Drag-and-drop dropzone or "Choose Files" button.
     * Allowed formats helper badge (`JPG, PNG, WEBP, PDF - max 5MB`).
     * Pending files preview list with individual delete buttons.
  5. *Actions*:
     * "Cancel" secondary button (returns to `/tickets`).
     * "Submit Ticket" primary green button (`#006B3C`).
* **Validation & Error Behavior**:
  * Inline validation errors appear under invalid fields immediately upon submission attempt or blur.
  * If submission fails via network/server error, an alert banner appears at top, and all form data is preserved.
  * During submission, "Submit Ticket" button changes to busy spinner with text "Submitting Ticket…".

---

### 5.3. Screen 3: My Tickets Screen (`/tickets`)

```
+-----------------------------------------------------------------------------------+
| My Tickets                                           [ Clear Filters ] [ + Create Ticket ]
| View and track all of your support requests.                                      |
|                                                                                   |
| +-- Filter Toolbar -------------------------------------------------------------+ |
| | [ Search by number or summary... ] [ Category v ] [ Req Priority v ] [ Status v ]|
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| +-- Desktop Table View ---------------------------------------------------------+ |
| | Ticket No ^ | Created Date | Summary         | Category | Priority | Status   | |
| |-------------+--------------+-----------------+----------+----------+----------| |
| | TKT-2026-01 | May 12 09:14 | Laptop battery  | Hardware | [Medium] | [ New  ] | |
| | TKT-2026-02 | May 11 14:30 | VPN fails on Wi | Network  | [ High ] | [ Open ] | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| Showing 1 to 10 of 42 tickets                      [ < Prev ] [ 1 ] [ 2 ] [ Next > ]
+-----------------------------------------------------------------------------------+
```

* **Header Controls**:
  * Title: "My Tickets" and sub-caption.
  * Right: "Clear Filters" secondary button (disabled if no active filters) + "+ Create Ticket" primary button (`#006B3C`).
* **Filter Toolbar**:
  * Search input: Text filter matching ticket number or summary.
  * Category dropdown: `All Categories`, `Account and Access`, `Hardware`, `Software`, `Network`.
  * Requested Priority dropdown: `All Priorities`, `Low`, `Medium`, `High`, `Urgent`.
  * IT Priority dropdown: `All IT Priorities`, `Low`, `Medium`, `High`, `Urgent`.
  * Status dropdown: `All Statuses`, `New`, `Open`, `In Progress`, `Resolved`, `Closed`, `Cancelled`.
* **Data Presentation**:
  * **Desktop/Tablet**: Responsive table with columns: `Ticket No`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `IT Priority`, `Status`, `Ticket Owner`, `Last Updated`. Clicking row navigates to ticket details.
  * **Mobile (<768px)**: Stacked ticket cards displaying Ticket No header, date, bold summary, category badge, priority badge, and status badge.
* **Pagination Footer**:
  * Summary text: "Showing X to Y of Z tickets".
  * Page size selector dropdown: `10`, `20`, `50` items per page (default `10`).
  * Page buttons: Previous, numbered page buttons with active highlight in `#006B3C`, Next.
* **Zero States**:
  * *Empty State* (User has 0 tickets): Displays desk illustration, "No tickets submitted yet", and "Create Your First Ticket" button.
  * *No-Results State* (Filters matched 0 tickets): Displays search icon, "No tickets match your search or filter criteria", and "Clear All Filters" button.

---

### 5.4. Screen 4: Requester Ticket Detail Screen (`/tickets/:idOrNumber`)

```
+-----------------------------------------------------------------------------------+
| My Tickets > Ticket Details                                    [ <- Back to My Tickets ]
|                                                                                   |
| +-- Ticket Overview Header Card ------------------------------------------------+ |
| | Ticket No: TKT-2026-000001     Date: May 12, 2026 09:14 AM                      |
| | Category: Hardware             Related System: Corporate Laptop                 |
| | Requester: Jennifer Anderson   Ticket Owner: Michael Brown (IT Support)         |
| | Requested Priority: [Medium]   IT Priority: [Medium]   Status: [ In Progress ]  |
| |                                                                               | |
| | Summary: Laptop battery drains quickly under normal load                      | |
| |                                                                               | |
| | Description:                                                                  | |
| | My laptop battery is draining much faster than usual even when idle...        | |
| |                                                                               | |
| | Resolution Summary:                                                           | |
| | No resolution summary available yet.                                          | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| +-- Attachments Panel (2) -------------------------------- [ + Add Attachment ] -+ |
| | Active Attachments:                                                           | |
| | [PDF] battery_report.pdf (240 KB) - Uploaded May 12  [ Download ] [ Remove ]  | |
| |                                                                               | |
| | Removed Attachments:                                                          | |
| | [PNG] ~screenshot_err.png~ (500 KB) - [Removed] Reason: Wrong file [Blocked]  | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

* **Read-Only Form Card**:
  * All fields displayed with clear labels and read-only container styling (`#F0F4F1`).
  * Status and Priority displayed using designated badges.
  * Resolution Summary displayed in a subtle callout box.
* **Attachments Section**:
  * Top bar: Total attachment count and "+ Add Attachment" button (disabled if 5 active attachments reached).
  * Active Attachments:
    * File icon corresponding to type (PDF icon, Image icon).
    * Original file name, formatted size (`240 KB`, `1.2 MB`), upload timestamp.
    * "Download" secondary button (triggers file stream).
    * "Remove" destructive button (opens soft removal confirmation modal).
  * Removed Attachments Audit List:
    * Strikethrough file name (`text-decoration: line-through`).
    * "Removed" gray badge.
    * Removal timestamp and removal reason note.
    * Download button replaced with disabled "Unavailable" indicator.
* **Soft Removal Modal**:
  * Title: "Remove Attachment".
  * Warning message: "This attachment will be removed and will no longer be downloadable. Its metadata will remain in the ticket history."
  * Input: Optional "Reason for removal" (placeholder / default: `"Removed by requester"`).
  * Modal Actions: "Cancel" and "Confirm Removal" (Destructive red button).
* **Cross-Requester Unauthorized State**:
  * If the active Requester attempts to open a ticket owned by someone else, displays an access denied card: "Ticket Not Found or Access Denied" with a "Return to My Tickets" button.

---

## 6. Responsive Layout Breakpoints & Rules

```
+-----------------------------------------------------------------------------+
| Desktop (>= 992px)   : 3-column form grids, full data table, centered 1200px|
| Tablet (768px-991px) : 2-column form grids, compact scrollable data table   |
| Mobile (< 768px)     : 1-column vertically stacked, cards replace table     |
+-----------------------------------------------------------------------------+
```

### 6.1. Desktop (`>= 992px`)
* Centered main container max-width: `1140px` to `1200px`.
* Multi-column form fields (Category, Related System, Priority side-by-side).
* My Tickets renders full data table with sortable column headers.

### 6.2. Tablet (`768px – 991px`)
* Form controls arranged in 2-column flow; Summary and Description take 100% width.
* Filter toolbar stacks into 2 rows.
* Table accommodates smaller widths with compact padding and horizontal touch scroll if needed.

### 6.3. Mobile (`< 768px`)
* Single column vertical stack for all form fields and action buttons.
* My Tickets table transforms into a vertical list of touch-friendly cards.
* Filter controls stack into a full-width filter drawer or expandable accordion.
* Action buttons span full width (`w-100`) with min-height `44px` for touch accessibility.
* Zero horizontal window scroll (`overflow-x: hidden` on viewport container).

---

## 7. Accessibility (a11y) Rules

1. **Color Contrast**: All text against background meets WCAG AA standard (contrast ratio >= 4.5:1 for normal text, >= 3:1 for large text).
2. **Keyboard Navigation**:
   * All interactive elements (inputs, dropdowns, buttons, links) are reachable via `Tab` key.
   * Focus states use a visible `3px` outline ring in `#0B7A46`.
3. **Screen Readers**:
   * Form inputs are explicitly paired with `<label htmlFor="...">`.
   * Required field asterisks include `aria-hidden="true"` with `aria-required="true"` on the input.
   * Inline validation messages are linked via `aria-describedby="field-error-id"`.
   * Status changes and alerts use `role="status"` or `aria-live="polite"`.
4. **Non-Color Indicators**: Information conveyed by color (e.g. status, priority, error) always includes accompanying text and icons.

---

## 8. Visual Inspection Checklist & Screenshot Paths

During visual quality assurance and Playwright automation, screenshots must be captured and verified in the following directory structure:

```text
artifacts/lab-02/screenshots/
├── create-ticket/
│   ├── create-ticket-desktop-initial.png
│   ├── create-ticket-validation-errors.png
│   ├── create-ticket-submitting-busy.png
│   ├── create-ticket-success-dialog.png
│   ├── create-ticket-api-failure-preserved.png
│   ├── create-ticket-tablet.png
│   └── create-ticket-mobile.png
├── my-tickets/
│   ├── my-tickets-desktop-populated.png
│   ├── my-tickets-filtered-results.png
│   ├── my-tickets-empty-state.png
│   ├── my-tickets-no-results-state.png
│   ├── my-tickets-requester-switch-isolated.png
│   ├── my-tickets-tablet.png
│   └── my-tickets-mobile-cards.png
└── ticket-detail/
    ├── ticket-detail-desktop-view.png
    ├── ticket-detail-attachment-active.png
    ├── ticket-detail-attachment-soft-removed.png
    ├── ticket-detail-remove-modal.png
    ├── ticket-detail-unauthorized-denied.png
    ├── ticket-detail-tablet.png
    └── ticket-detail-mobile.png
```
