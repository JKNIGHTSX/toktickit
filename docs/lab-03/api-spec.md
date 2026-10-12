# Lab 3 REST API Specification — TokTickIT

## 1. Overview & Conventions

All endpoints are relative to the base URL:
```text
http://localhost:3000/api
```

### 1.1. Common Headers
* `Content-Type: application/json` (for JSON request/response bodies)
* `Content-Type: multipart/form-data` (for attachment upload endpoints)
* `Cookie: connect.sid=<session_id>` or `Authorization: Bearer <session_token>` (for authenticating requests)

### 1.2. Authentication & Session Strategy
Authentication relies on secure, HTTP-only session cookies (or signed bearer tokens). Upon successful authentication via `POST /api/auth/login`, the server establishes an active session binding the connection to the authenticated user ID and role.
* If a request is made without a valid session, the server returns `401 Unauthorized`.
* If a user's `mustChangePassword` flag is `true`, any request to endpoints other than `/api/auth/me`, `/api/auth/change-password`, and `/api/auth/logout` returns `403 Forbidden` with code `MUST_CHANGE_PASSWORD`.

### 1.3. Standard Response Envelopes

#### Standard Single Resource / Success Envelope:
```json
{
  "data": { /* Resource object */ },
  "message": "Optional human-readable success message"
}
```

#### Standard Error Response Envelope:
```json
{
  "error": "Human-readable summary of the error",
  "code": "ERROR_CODE_ENUM",
  "details": [
    {
      "field": "email",
      "message": "Email is already registered"
    }
  ]
}
```

#### Standard Paginated List Envelope:
```json
{
  "data": [ /* Array of resource objects */ ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 1.4. HTTP Status Codes
| HTTP Status | Meaning | Usage in Lab 3 |
| :--- | :--- | :--- |
| `200 OK` | Success | Successful GET, PATCH, DELETE operations, login/logout, password change. |
| `201 Created` | Resource Created | Successful POST creation (Ticket, User, Public Comment, Internal Note). |
| `400 Bad Request` | Validation / Guardrail Failure | Missing fields, weak password, self-deactivation attempt, last-admin deactivation. |
| `401 Unauthorized` | Unauthenticated | Missing or expired session/token, invalid credentials. |
| `403 Forbidden` | Authorization Failure | Role boundary violation, cross-requester access attempt, user requires password change. |
| `404 Not Found` | Resource Not Found | Non-existent ticket, user, or attachment requested. |
| `409 Conflict` | Resource Conflict | Duplicate email address during user creation or update. |
| `410 Gone` | Resource Removed | Download request for soft-removed attachment. |
| `422 Unprocessable`| Business Logic Violation | Invalid status transition, missing resolution summary. |
| `500 Internal Error`| Internal Server Error | Unhandled backend/database exception (safe error returned). |

---

## 2. Authorization Matrix

| Endpoint | Unauthenticated | Requester | IT Staff | Administrator |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | Allowed | Allowed | Allowed | Allowed |
| `POST /api/auth/logout` | `401` | Allowed | Allowed | Allowed |
| `GET /api/auth/me` | `401` | Allowed | Allowed | Allowed |
| `POST /api/auth/change-password` | `401` | Allowed | Allowed | Allowed |
| `POST /api/tickets` | `401` | Allowed (Self) | Allowed (Self) | Allowed (Self) |
| `GET /api/tickets` | `401` | Owned Tickets | Queue (All) | Queue (All) |
| `GET /api/tickets/:id` | `401` | Owned Only | Any Ticket | Any Ticket |
| `PATCH /api/tickets/:id/claim` | `401` | `403` | Allowed | Allowed |
| `PATCH /api/tickets/:id/assign` | `401` | `403` | Allowed | Allowed |
| `PATCH /api/tickets/:id/priority` | `401` | `403` | Allowed | Allowed |
| `PATCH /api/tickets/:id/status` | `401` | Permitted Only | Permitted Matrix | Permitted Matrix |
| `GET /api/tickets/:id/comments` | `401` | Owned Only | Allowed | Allowed |
| `POST /api/tickets/:id/comments` | `401` | Owned Only | Allowed | Allowed |
| `GET /api/tickets/:id/notes` | `401` | `403` | Allowed | Allowed |
| `POST /api/tickets/:id/notes` | `401` | `403` | Allowed | Allowed |
| `POST /api/tickets/:id/problem-appears-resolved` | `401` | Owned ticket only | `403` | `403` |
| `POST /api/tickets/:id/attachments` | `401` | Owned Only | Allowed | Allowed |
| `GET /api/attachments/:id/download` | `401` | Owned Only | Allowed | Allowed |
| `DELETE /api/attachments/:id` | `401` | Owned Only | Allowed | Allowed |
| `GET /api/users` | `401` | `403` | `403` | Allowed |
| `POST /api/users` | `401` | `403` | `403` | Allowed |
| `PATCH /api/users/:id` | `401` | `403` | `403` | Allowed |
| `POST /api/users/:id/reset-password` | `401` | `403` | `403` | Allowed |

---

## 3. Endpoints Specification

### 3.1. Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/login`
* **Purpose**: Authenticate user credentials and establish session.
* **Request Body**:
  ```json
  {
    "email": "tech1@toktickit.local",
    "password": "Password123!"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "user": {
        "id": 2,
        "email": "tech1@toktickit.local",
        "name": "Michael Brown",
        "role": "IT_STAFF",
        "mustChangePassword": false
      }
    },
    "message": "Login successful"
  }
  ```
* **Response `401 Unauthorized`** (Invalid credentials or inactive user):
  ```json
  {
    "error": "Invalid email or password",
    "code": "INVALID_CREDENTIALS"
  }
  ```

#### `POST /api/auth/logout`
* **Purpose**: Invalidate active session and clear session cookies.
* **Response `200 OK`**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

#### `GET /api/auth/me`
* **Purpose**: Retrieve currently authenticated user profile and mandatory password status.
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": 2,
      "email": "tech1@toktickit.local",
      "name": "Michael Brown",
      "department": "IT Support",
      "role": "IT_STAFF",
      "mustChangePassword": false,
      "isActive": true
    }
  }
  ```

#### `POST /api/auth/change-password`
* **Purpose**: Change password for authenticated user (mandatory first-login or voluntary).
* **Request Body**:
  ```json
  {
    "currentPassword": "Password123!",
    "newPassword": "NewSecurePass123#",
    "confirmPassword": "NewSecurePass123#"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "message": "Password changed successfully. You may now access the application."
  }
  ```
* **Response `400 Bad Request`** (Validation failure):
  ```json
  {
    "error": "Password policy violation",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "newPassword",
        "message": "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character"
      }
    ]
  }
  ```

---

### 3.2. Ticket Management Endpoints (`/api/tickets`)

#### `GET /api/tickets`
* **Purpose**: Retrieve paginated list of tickets.
  * **For Requester**: Returns owned tickets (`requesterId == currentUser.id`).
  * **For IT Staff / Admin**: Returns shared Ticket Queue supporting query filters.
* **Query Parameters**:
  * `page` (number, default: `1`)
  * `pageSize` (number, default: `10`)
  * `search` (string, optional: ticket number or summary)
  * `categoryId` (number, optional)
  * `requestedPriority` (`LOW` | `MEDIUM` | `HIGH` | `URGENT`, optional)
  * `itPriority` (`LOW` | `MEDIUM` | `HIGH` | `URGENT`, optional)
  * `status` (`NEW` | `OPEN` | `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | `RESOLVED` | `CLOSED` | `REOPENED` | `CANCELLED`, optional)
  * `assignedTo` (`UNASSIGNED` | `ME` | `<userId>`, optional)
  * `sortBy` (`ticketNumber` | `createdAt` | `requestedPriority` | `itPriority` | `status` | `updatedAt`, default: `createdAt`)
  * `sortOrder` (`asc` | `desc`, default: `desc`)
* **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "Laptop battery drains quickly",
        "category": { "id": 1, "name": "Hardware" },
        "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
        "requestedPriority": "MEDIUM",
        "itPriority": "MEDIUM",
        "status": "IN_PROGRESS",
        "requester": { "id": 5, "name": "Jennifer Anderson", "email": "jennifer.anderson@toktickit.local" },
        "owner": { "id": 2, "name": "Michael Brown", "role": "IT_STAFF" },
        "createdAt": "2026-05-12T09:14:00.000Z",
        "updatedAt": "2026-05-13T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 87,
      "totalPages": 9,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

#### `GET /api/tickets/:id`
* **Purpose**: Retrieve ticket details, requester details, owner details, attachments, public comments, and internal notes (internal notes included ONLY for IT Staff/Admin).
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "description": "My laptop battery is draining much faster than usual...",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "status": "IN_PROGRESS",
      "resolutionSummary": null,
      "createdAt": "2026-05-12T09:14:00.000Z",
      "updatedAt": "2026-05-13T10:30:00.000Z",
      "requester": { "id": 5, "name": "Jennifer Anderson", "email": "jennifer.anderson@toktickit.local" },
      "owner": { "id": 2, "name": "Michael Brown", "email": "tech1@toktickit.local" },
      "category": { "id": 1, "name": "Hardware" },
      "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
      "attachments": [ /* active attachment objects */ ],
      "publicComments": [ /* public comment objects */ ],
      "internalNotes": [ /* internal note objects if IT Staff/Admin; excluded for Requester */ ]
    }
  }
  ```

#### `PATCH /api/tickets/:id/claim`
* **Purpose**: IT Staff or Administrator claims ownership of a ticket.
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": 101,
      "ownerId": 2,
      "owner": { "id": 2, "name": "Michael Brown" },
      "status": "OPEN"
    },
    "message": "Ticket ownership claimed successfully"
  }
  ```

#### `PATCH /api/tickets/:id/assign`
* **Purpose**: Reassign ticket ownership to a designated IT Staff or Administrator user.
* **Request Body**:
  ```json
  {
    "ownerId": 3
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": 101,
      "ownerId": 3,
      "owner": { "id": 3, "name": "Sarah Johnson" }
    },
    "message": "Ticket reassigned successfully"
  }
  ```

#### `PATCH /api/tickets/:id/priority`
* **Purpose**: Update IT Priority.
* **Request Body**:
  ```json
  {
    "itPriority": "HIGH"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": 101,
      "itPriority": "HIGH"
    },
    "message": "IT Priority updated to HIGH"
  }
  ```

#### `PATCH /api/tickets/:id/status`
* **Purpose**: Update ticket status following permitted transition rules.
* **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "resolutionSummary": "Replaced laptop battery pack and updated power control drivers.",
    "action": "FORMAL_RESOLVE" 
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": 101,
      "status": "RESOLVED",
      "resolutionSummary": "Replaced laptop battery pack and updated power control drivers."
    },
    "message": "Ticket status updated to RESOLVED"
  }
  ```

---

### 3.3. Collaboration Endpoints (Comments & Notes)

#### `GET /api/tickets/:id/comments`
* **Purpose**: Retrieve Public Comments timeline for a ticket.
* **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "content": "Just adding that this issue occurs even when I close all applications.",
      "createdAt": "2026-05-12T09:20:00.000Z",
      "author": {
        "id": 5,
        "name": "Jennifer Anderson",
        "role": "REQUESTER"
      }
    }
  ]
  ```

#### `POST /api/tickets/:id/comments`
* **Purpose**: Post an append-only Public Comment on a ticket.
* **Request Body**:
  ```json
  {
    "content": "We are investigating the issue on your device. We will update you shortly."
  }
  ```
* **Response `201 Created`**:
  ```json
  {
    "data": {
      "id": 2,
      "ticketId": 101,
      "content": "We are investigating the issue on your device. We will update you shortly.",
      "createdAt": "2026-05-13T10:30:00.000Z",
      "author": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      }
    },
    "message": "Public comment posted"
  }
  ```

#### `GET /api/tickets/:id/notes`
* **Purpose**: Retrieve private Internal Notes timeline (IT Staff & Admin ONLY).
* **Access**: `IT_STAFF`, `ADMINISTRATOR` (Returns `403 Forbidden` for `REQUESTER`).
* **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "content": "Checked battery health logs remotely. Battery capacity is at 42%. Diagnostics order #9921 placed.",
      "createdAt": "2026-05-12T10:15:00.000Z",
      "author": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      }
    }
  ]
  ```

#### `POST /api/tickets/:id/notes`
* **Purpose**: Write an append-only Internal Note (IT Staff & Admin ONLY).
* **Request Body**:
  ```json
  {
    "content": "Replacement battery delivered to desk 4B."
  }
  ```
* **Response `201 Created`**:
  ```json
  {
    "data": {
      "id": 2,
      "ticketId": 101,
      "content": "Replacement battery delivered to desk 4B.",
      "createdAt": "2026-05-13T09:00:00.000Z",
      "author": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      }
    },
    "message": "Internal note recorded"
  }
  ```

#### `POST /api/tickets/:id/problem-appears-resolved`
* **Purpose**: Let the owner Requester indicate that an in-progress or waiting ticket appears resolved.
* **Behavior**: Atomically transitions the ticket to `RESOLVED` and appends a Public Comment attributed to the authenticated Requester. This is a resolution indication, not an IT resolution summary.
* **Response `200 OK`**: Returns the updated ticket and created Public Comment.
* **Errors**: `403 Forbidden` for non-requesters or non-owned tickets, `404 Not Found` for a missing ticket, and `422 Unprocessable` when the ticket is not `IN_PROGRESS` or `WAITING_FOR_REQUESTER`.

---

### 3.4. Administrator User Management Endpoints (`/api/users`)

#### `GET /api/users`
* **Purpose**: Retrieve list of user accounts with search and role filtering (Admin ONLY).
* **Query Parameters**:
  * `search` (string, optional: matches name or email)
  * `role` (`REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`, optional)
* **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "name": "John Smith",
      "email": "admin@toktickit.local",
      "role": "ADMINISTRATOR",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Michael Brown",
      "email": "tech1@toktickit.local",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-01-02T00:00:00.000Z"
    }
  ]
  ```

#### `POST /api/users`
* **Purpose**: Create a new user account with one role and an initial password.
* **Request Body**:
  ```json
  {
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.local",
    "role": "IT_STAFF",
    "isActive": true,
    "initialPassword": "TempPassword123!"
  }
  ```
* **Response `201 Created`**:
  ```json
  {
    "data": {
      "id": 10,
      "name": "Alex Thompson",
      "email": "alex.thompson@toktickit.local",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": true
    },
    "message": "User account created successfully"
  }
  ```

#### `PATCH /api/users/:id`
* **Purpose**: Update basic user info, role, or activation status.
* **Request Body**:
  ```json
  {
    "name": "Alex Thompson Jr.",
    "role": "IT_STAFF",
    "isActive": true
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": 10,
      "name": "Alex Thompson Jr.",
      "email": "alex.thompson@toktickit.local",
      "role": "IT_STAFF",
      "isActive": true
    },
    "message": "User updated successfully"
  }
  ```
* **Response `400 Bad Request`** (Self-deactivation or last-admin guardrail violation):
  ```json
  {
    "error": "Cannot deactivate your own active Administrator account",
    "code": "SELF_DEACTIVATION_FORBIDDEN"
  }
  ```

#### `POST /api/users/:id/reset-password`
* **Purpose**: Assign a new initial password to a user account, enforcing `mustChangePassword = true`.
* **Request Body**:
  ```json
  {
    "initialPassword": "NewTempPass123!"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "message": "New initial password set. User will be required to change it at next login."
  }
  ```
