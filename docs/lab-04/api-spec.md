# Lab 4 REST API Specification — TokTickIT

## 1. Overview & Conventions

All endpoints are relative to the base URL:
```text
http://localhost:3000/api
```

### 1.1. Common Headers
* `Content-Type: application/json` (for all JSON request/response payloads)
* `Cookie: connect.sid=<session_id>` or `Authorization: Bearer <session_token>` (for session authentication)

### 1.2. Authentication & Authorization Enforcement
All endpoints enforce user authentication and role verification server-side:
* Unauthenticated requests return `401 Unauthorized`.
* Unauthorized roles return `403 Forbidden`.
* Requesters attempting to view or modify tickets they do not own return `403 Forbidden` or `404 Not Found`.
* Accounts flagged with `mustChangePassword = true` return `403 Forbidden` (`MUST_CHANGE_PASSWORD`).

### 1.3. Standard Response Envelopes

#### Success Envelope (Single Resource):
```json
{
  "data": { /* resource object */ },
  "message": "Optional human-readable confirmation message"
}
```

#### Paginated List Envelope:
```json
{
  "data": [ /* resource array */ ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Safe Error Envelope:
```json
{
  "error": "Concise human-readable explanation of error",
  "code": "ERROR_CODE_IDENTIFIER",
  "details": [
    {
      "field": "followUpNote",
      "message": "Follow-up note is required when follow-up is requested"
    }
  ]
}
```

### 1.4. HTTP Status Codes
| HTTP Status | Meaning | Lab 4 Usage |
| :--- | :--- | :--- |
| `200 OK` | Success | Successful GET, PATCH (update Action Taken, update status). |
| `201 Created` | Created | Successful creation of an Action Taken record. |
| `400 Bad Request` | Validation Failure | Missing required fields, invalid date format, followUpNote missing when follow-up requested. |
| `401 Unauthorized` | Unauthenticated | Missing, expired, or invalid session. |
| `403 Forbidden` | Access Denied | Role permission violation (e.g., Requester attempting to create Action Taken). |
| `404 Not Found` | Resource Missing | Specified Ticket ID or Action ID does not exist. |
| `409 Conflict` | Stale Update / Concurrency | Stale `updatedAt` detected during ticket transition or action update. |
| `422 Unprocessable`| Business Gate Failure | Resolution gate failed (0 actions taken, empty summary, invalid status transition). |
| `500 Server Error` | Safe Internal Error | Unexpected database or internal failure. |

---

## 2. Authorization Matrix

| Endpoint | Method | Unauthenticated | Requester | IT Staff | Administrator | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/tickets/:id/actions` | `GET` | `401` | Owned Tickets | Any Ticket | Any Ticket | Requesters can only read actions for their own tickets. |
| `/api/tickets/:id/actions` | `POST` | `401` | `403` | Allowed | Allowed | Creates Action Taken. Performer stamped from session. |
| `/api/actions/:id` | `GET` | `401` | Owned Ticket | Any Ticket | Any Ticket | Fetches single Action Taken record. |
| `/api/actions/:id` | `PATCH` | `401` | `403` | Allowed | Allowed | Updates Action Taken record. Checks concurrency. |
| `/api/tickets/:id/status` | `PATCH` | `401` | Advisory Only | Permitted Matrix | Permitted Matrix | Resolution gate enforced: requires `>= 1` Action Taken. |
| `/api/dashboard/requester` | `GET` | `401` | Allowed (Self) | `403` | `403` | Requesters view only their own ticket metrics. |
| `/api/dashboard/staff` | `GET` | `401` | `403` | Allowed | Allowed | Operational metrics for shared queue and assigned tickets. |
| `/api/dashboard/admin` | `GET` | `401` | `403` | `403` | Allowed | Operational metrics + user management counters. |

---

## 3. Actions Taken REST Endpoints

### 3.1. List Actions Taken for Ticket
* **Route**: `GET /api/tickets/:id/actions`
* **Roles**: Requester (owned tickets only), IT Staff, Administrator
* **URL Parameters**: `id` (integer, Ticket ID)
* **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": 101,
      "ticketId": 12,
      "performedById": 2,
      "performedBy": {
        "id": 2,
        "name": "Michael Brown",
        "email": "michael.brown@toktickit.local",
        "role": "IT_STAFF"
      },
      "actionDateTime": "2026-10-21T10:30:00.000Z",
      "actionDescription": "Replaced swollen battery pack with OEM Part #BAT-992.",
      "result": "Laptop boots normally on battery power. Diagnostics report 100% capacity.",
      "isFollowUpRequired": true,
      "followUpNote": "Monitor battery charging cycle over next 24 hours.",
      "attachmentNotes": "Hardware serial logged on inventory asset tag 55829.",
      "createdAt": "2026-10-21T10:35:00.000Z",
      "updatedAt": "2026-10-21T10:35:00.000Z"
    }
  ]
}
```

### 3.2. Create Action Taken
* **Route**: `POST /api/tickets/:id/actions`
* **Roles**: `IT_STAFF`, `ADMINISTRATOR`
* **URL Parameters**: `id` (integer, Ticket ID)
* **Request Body**:
```json
{
  "actionDateTime": "2026-10-21T10:30:00.000Z",
  "actionDescription": "Replaced swollen battery pack with OEM Part #BAT-992.",
  "result": "Laptop boots normally on battery power. Diagnostics report 100% capacity.",
  "isFollowUpRequired": true,
  "followUpNote": "Monitor battery charging cycle over next 24 hours.",
  "attachmentNotes": "Hardware serial logged on inventory asset tag 55829."
}
```
* **Validation Rules**:
  * `actionDescription`: Required string, 5 to 1000 characters.
  * `result`: Required string, 2 to 1000 characters.
  * `isFollowUpRequired`: Boolean (defaults to `false`).
  * `followUpNote`: Conditional string. If `isFollowUpRequired = true`, must be non-empty (3 to 1000 characters). If `false`, must be `null` or omitted.
  * `attachmentNotes`: Optional string (max 500 characters).
  * `actionDateTime`: Optional ISO-8601 string (defaults to server `now()`). Cannot be in future (>5 minutes).
* **Response (201 Created)**: Returns created Action Taken object.
* **Error Responses**:
  * `400 Bad Request` (`VALIDATION_ERROR`): Missing fields or invalid follow-up note.
  * `403 Forbidden` (`FORBIDDEN`): User is a Requester or inactive.
  * `404 Not Found` (`TICKET_NOT_FOUND`): Ticket does not exist.
  * `422 Unprocessable Entity` (`TICKET_CLOSED`): Cannot add actions to a `CLOSED` ticket.

### 3.3. Update Action Taken
* **Route**: `PATCH /api/actions/:id`
* **Roles**: `IT_STAFF`, `ADMINISTRATOR`
* **URL Parameters**: `id` (integer, Action Taken ID)
* **Request Body**:
```json
{
  "actionDescription": "Updated: Replaced swollen battery pack with OEM Part #BAT-992 and replaced thermal paste.",
  "result": "Laptop boots normally on battery power. Thermal testing at 42°C peak.",
  "isFollowUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See attached thermal benchmark report in internal notes.",
  "expectedUpdatedAt": "2026-10-21T10:35:00.000Z"
}
```
* **Optimistic Concurrency**: If `expectedUpdatedAt` is supplied and does not match the database `updatedAt`, returns `409 Conflict`.
* **Response (200 OK)**: Returns updated Action Taken object.
* **Error Responses**:
  * `400 Bad Request`: Validation failure.
  * `404 Not Found`: Action Taken not found.
  * `409 Conflict` (`STALE_UPDATE_CONFLICT`): Stale update conflict.

---

## 4. Ticket Status Workflow & Resolution Gate

### 4.1. Update Ticket Status
* **Route**: `PATCH /api/tickets/:id/status`
* **Roles**: `IT_STAFF`, `ADMINISTRATOR` (Permitted Matrix)
* **URL Parameters**: `id` (integer, Ticket ID)
* **Request Body**:
```json
{
  "status": "RESOLVED",
  "resolutionSummary": "Replaced battery pack and verified hardware stability under full load.",
  "expectedUpdatedAt": "2026-10-21T09:15:00.000Z"
}
```
* **Resolution Gate Enforcement**:
  * If `status === "RESOLVED"`:
    1. System queries `prisma.actionTaken.count({ where: { ticketId: id } })`. If count is 0, rejects with `422 Unprocessable Entity`:
       ```json
       {
         "error": "Cannot resolve ticket without at least one recorded Action Taken.",
         "code": "RESOLUTION_REQUIRES_ACTION_TAKEN"
       }
       ```
    2. System verifies `resolutionSummary` is a non-empty string of at least 5 characters. If empty/too short, rejects with `422 Unprocessable Entity`:
       ```json
       {
         "error": "A resolution summary of at least 5 characters is required.",
         "code": "RESOLUTION_SUMMARY_REQUIRED"
       }
       ```
* **Closure Gate Enforcement**:
  * If `status === "CLOSED"`: Permitted only for `IT_STAFF` or `ADMINISTRATOR` from `RESOLVED` state.
* **Response (200 OK)**:
```json
{
  "data": {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "status": "RESOLVED",
    "resolutionSummary": "Replaced battery pack and verified hardware stability under full load.",
    "updatedAt": "2026-10-21T11:00:00.000Z"
  },
  "message": "Ticket status updated to RESOLVED"
}
```

---

## 5. Dashboard REST Endpoints

### 5.1. Requester Dashboard
* **Route**: `GET /api/dashboard/requester`
* **Roles**: `REQUESTER`
* **Query Parameters**: None (scoped strictly to `currentUser.id`)
* **Response (200 OK)**:
```json
{
  "data": {
    "metrics": {
      "totalOpen": 3,
      "inProgress": 2,
      "resolved": 5,
      "closed": 12
    },
    "recentTickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "Laptop battery drains quickly",
        "status": "IN_PROGRESS",
        "requestedPriority": "HIGH",
        "updatedAt": "2026-10-21T09:14:00.000Z",
        "category": { "name": "Hardware" }
      }
    ]
  }
}
```

### 5.2. IT Staff Dashboard
* **Route**: `GET /api/dashboard/staff`
* **Roles**: `IT_STAFF`, `ADMINISTRATOR`
* **Response (200 OK)**:
```json
{
  "data": {
    "metrics": {
      "newTickets": 14,
      "openTickets": 23,
      "inProgressTickets": 18,
      "waitingForRequesterTickets": 7,
      "myAssignedTickets": 16
    },
    "recentTickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "Laptop battery drains quickly",
        "status": "IN_PROGRESS",
        "itPriority": "HIGH",
        "requester": { "name": "Jennifer Anderson", "email": "janderson@toktickit.local" },
        "owner": { "id": 2, "name": "Michael Brown" },
        "updatedAt": "2026-10-21T09:14:00.000Z"
      }
    ]
  }
}
```

### 5.3. Administrator Dashboard
* **Route**: `GET /api/dashboard/admin`
* **Roles**: `ADMINISTRATOR`
* **Response (200 OK)**:
```json
{
  "data": {
    "metrics": {
      "newTickets": 14,
      "openTickets": 23,
      "inProgressTickets": 18,
      "waitingForRequesterTickets": 7,
      "myAssignedTickets": 16,
      "userSummary": {
        "totalUsers": 28,
        "activeUsers": 26,
        "inactiveUsers": 2
      }
    },
    "recentTickets": [ /* same as IT Staff */ ]
  }
}
```

---

## 6. Concurrency & Error Codes Table

| Code | HTTP Status | Trigger Condition |
| :--- | :--- | :--- |
| `STALE_UPDATE_CONFLICT` | 409 | `expectedUpdatedAt` submitted is older than database `updatedAt`. |
| `RESOLUTION_REQUIRES_ACTION_TAKEN` | 422 | Ticket has 0 Actions Taken when attempting to transition to `RESOLVED`. |
| `RESOLUTION_SUMMARY_REQUIRED` | 422 | `resolutionSummary` missing or shorter than 5 chars on `RESOLVED`. |
| `INVALID_STATUS_TRANSITION` | 422 | Attempted transition not permitted by the status lifecycle matrix. |
| `FOLLOW_UP_NOTE_REQUIRED` | 400 | `isFollowUpRequired = true` but `followUpNote` is empty or whitespace. |
| `TICKET_CLOSED` | 422 | Attempted to add Action Taken or change status of a `CLOSED` ticket. |
