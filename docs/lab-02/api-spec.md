# Lab 2 REST API Specification — TokTickIT

## 1. Overview & Conventions

This document specifies the REST API contract for TokTickIT Lab 2. All endpoints are relative to the base URL:
```text
http://localhost:3000/api
```

### 1.1. Common Headers
* `Content-Type: application/json` (for JSON request/response bodies)
* `Content-Type: multipart/form-data` (for attachment upload endpoints)
* `X-Requester-Id: <number>`: Identifies the active Development Requester simulating user identity. When provided, the backend enforces that all queries and mutations operate strictly on resources owned by this `requesterId`.

### 1.2. Standard Response Envelopes
All successful single-resource responses return JSON objects directly or in a structured payload.

#### Standard Error Response Envelope:
```json
{
  "error": "Human-readable summary of the error",
  "code": "ERROR_CODE_ENUM",
  "details": [
    {
      "field": "summary",
      "message": "Summary must be between 5 and 150 characters"
    }
  ]
}
```

#### Standard Paginated List Response Envelope:
```json
{
  "data": [ /* Array of resource items */ ],
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

### 1.3. Standard HTTP Status Codes
| HTTP Status | Meaning | Usage in Lab 2 |
| :--- | :--- | :--- |
| `200 OK` | Success | Successful GET, PATCH, DELETE operations. |
| `201 Created` | Resource Created | Successful POST creation (Ticket, Attachment). |
| `400 Bad Request` | Validation Failure | Invalid input payload, missing required fields, boundary violations. |
| `403 Forbidden` | Ownership / Access Denied | Requester attempted to access or mutate resources belonging to another Requester. |
| `404 Not Found` | Not Found | Requested ticket, category, system, or attachment does not exist. |
| `410 Gone` | Resource Removed | Attempting to download or preview a soft-removed attachment. |
| `413 Payload Too Large`| File Exceeds Limit | Attachment exceeds maximum allowed size of 5 MB (5,242,880 bytes). |
| `415 Unsupported Media`| Invalid MIME Type | Attachment file type is not JPG, PNG, WEBP, or PDF. |
| `422 Unprocessable` | Business Rule Violation | Ticket active attachment limit of 5 exceeded. |
| `500 Internal Server` | Server Error | Unhandled server or database exception (returns safe message). |

---

## 2. API Endpoints

### 2.1. Reference Data Endpoints

#### `GET /api/requesters`
* **Purpose**: Retrieve active Development Requesters to populate the Requester Selection dropdown.
* **Query Parameters**: None.
* **Headers**: None required.
* **Ownership Rules**: Public in dev mode (returns only `isActive: true` records).
* **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@toktickit.local",
      "department": "Marketing",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Michael Brown",
      "email": "michael.brown@toktickit.local",
      "department": "Finance",
      "isActive": true
    },
    {
      "id": 3,
      "name": "Sarah Johnson",
      "email": "sarah.johnson@toktickit.local",
      "department": "Human Resources",
      "isActive": true
    },
    {
      "id": 4,
      "name": "David Lee",
      "email": "david.lee@toktickit.local",
      "department": "Engineering",
      "isActive": true
    }
  ]
  ```
* **Error Response `500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to fetch development requesters",
    "code": "INTERNAL_SERVER_ERROR"
  }
  ```

---

#### `GET /api/categories`
* **Purpose**: Retrieve active Ticket Categories to populate category dropdowns and filter lists.
* **Query Parameters**: None.
* **Response `200 OK`**:
  ```json
  [
    { "id": 1, "name": "Account and Access", "description": "Login, permissions, and account requests" },
    { "id": 2, "name": "Hardware", "description": "Laptops, monitors, peripherals, and accessories" },
    { "id": 3, "name": "Software", "description": "Application issues, licenses, and installation" },
    { "id": 4, "name": "Network", "description": "VPN, Wi-Fi, DNS, and connectivity issues" }
  ]
  ```

---

#### `GET /api/related-systems`
* **Purpose**: Retrieve active Related Systems to populate system dropdowns.
* **Query Parameters**: None.
* **Response `200 OK`**:
  ```json
  [
    { "id": 1, "name": "Email" },
    { "id": 2, "name": "Campus Wi-Fi" },
    { "id": 3, "name": "VPN" },
    { "id": 4, "name": "LEB2 App" },
    { "id": 5, "name": "Grade Submission App" },
    { "id": 6, "name": "Printer" },
    { "id": 7, "name": "Corporate Laptop" }
  ]
  ```

---

### 2.2. Ticket Endpoints

#### `POST /api/tickets`
* **Purpose**: Create a new IT support ticket for the active Requester.
* **Headers**: `Content-Type: application/json`, `X-Requester-Id: <number>` (or passed in body).
* **Request Body**:
  ```json
  {
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 7,
    "summary": "Laptop battery drains quickly under normal load",
    "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
    "requestedPriority": "MEDIUM"
  }
  ```
* **Validation Rules**:
  * `requesterId`: Required, must correspond to an active `RequesterUser` (`isActive: true`).
  * `categoryId`: Required, must exist in `Category` table.
  * `relatedSystemId`: Required, must exist in `RelatedSystem` table.
  * `summary`: Required, trimmed string, length between 5 and 150 characters.
  * `description`: Required, trimmed string, length between 10 and 2000 characters.
  * `requestedPriority`: Required, must be one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
* **Backend Processing**:
  * Generates unique Ticket Number `TKT-YYYY-NNNNNN`.
  * Sets `status = "NEW"`.
  * Sets `itPriority = null` (or unassigned).
  * Sets `ticketOwnerName = null`.
  * Sets `resolutionSummary = null`.
  * Sets `createdAt = NOW()`, `updatedAt = NOW()`.
* **Response `201 Created`**:
  ```json
  {
    "id": 1,
    "ticketNumber": "TKT-2026-000001",
    "requesterId": 1,
    "requester": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@toktickit.local"
    },
    "categoryId": 2,
    "category": {
      "id": 2,
      "name": "Hardware"
    },
    "relatedSystemId": 7,
    "relatedSystem": {
      "id": 7,
      "name": "Corporate Laptop"
    },
    "summary": "Laptop battery drains quickly under normal load",
    "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
    "requestedPriority": "MEDIUM",
    "itPriority": null,
    "status": "NEW",
    "ticketOwnerName": null,
    "resolutionSummary": null,
    "attachments": [],
    "createdAt": "2026-09-04T10:00:00.000Z",
    "updatedAt": "2026-09-04T10:00:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`:
    ```json
    {
      "error": "Validation failed",
      "code": "VALIDATION_ERROR",
      "details": [
        { "field": "summary", "message": "Summary must be between 5 and 150 characters" },
        { "field": "categoryId", "message": "Valid category selection is required" }
      ]
    }
    ```
  * `403 Forbidden`:
    ```json
    {
      "error": "Selected requester is inactive and cannot create tickets",
      "code": "REQUESTER_INACTIVE"
    }
    ```

---

#### `GET /api/tickets`
* **Purpose**: Retrieve a paginated, filterable, and sortable list of tickets owned strictly by the active Requester.
* **Headers**: `X-Requester-Id: <number>` (or query parameter `requesterId`).
* **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `requesterId` | Integer | Yes (if no header) | - | Target Requester ID |
  | `page` | Integer | No | `1` | 1-based page number |
  | `pageSize` | Integer | No | `10` | Number of items per page (1 to 50) |
  | `search` | String | No | - | Case-insensitive search on `ticketNumber` or `summary` |
  | `categoryId` | Integer | No | - | Filter by Category ID |
  | `requestedPriority` | Enum | No | - | Filter by Requested Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) |
  | `itPriority` | Enum | No | - | Filter by IT Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) |
  | `status` | Enum | No | - | Filter by Status (`NEW`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`) |
  | `sortBy` | String | No | `createdAt` | Sort field: `createdAt`, `ticketNumber`, `summary`, `status`, `requestedPriority`, `updatedAt` |
  | `sortOrder` | String | No | `desc` | Sort direction: `asc` or `desc` |
* **Ownership Rule**: The backend enforces `WHERE requesterId = <activeRequesterId>`. Tickets belonging to any other requester are never returned.
* **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "ticketNumber": "TKT-2026-000001",
        "requesterId": 1,
        "category": { "id": 2, "name": "Hardware" },
        "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
        "summary": "Laptop battery drains quickly under normal load",
        "requestedPriority": "MEDIUM",
        "itPriority": "MEDIUM",
        "status": "NEW",
        "ticketOwnerName": "Michael Brown (IT Support)",
        "createdAt": "2026-09-04T10:00:00.000Z",
        "updatedAt": "2026-09-04T10:30:00.000Z",
        "attachmentCount": 2
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
  ```
* **Error Response `400 Bad Request`**:
  ```json
  {
    "error": "Requester ID is required to retrieve tickets",
    "code": "MISSING_REQUESTER_ID"
  }
  ```

---

#### `GET /api/tickets/:idOrNumber`
* **Purpose**: Retrieve complete details of a single ticket (including its full attachment list) owned by the active Requester.
* **Path Parameters**: `:idOrNumber` (Database numeric ID e.g. `1` or formatted Ticket Number e.g. `TKT-2026-000001`).
* **Headers**: `X-Requester-Id: <number>`.
* **Ownership Rule**: If the ticket exists but `ticket.requesterId !== activeRequesterId`, the API returns `404 Not Found` (or `403 Forbidden`) to prevent unauthorized discovery.
* **Response `200 OK`**:
  ```json
  {
    "id": 1,
    "ticketNumber": "TKT-2026-000001",
    "requesterId": 1,
    "requester": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@toktickit.local",
      "department": "Marketing"
    },
    "categoryId": 2,
    "category": {
      "id": 2,
      "name": "Hardware"
    },
    "relatedSystemId": 7,
    "relatedSystem": {
      "id": 7,
      "name": "Corporate Laptop"
    },
    "summary": "Laptop battery drains quickly under normal load",
    "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "status": "NEW",
    "ticketOwnerName": "Michael Brown (IT Support)",
    "resolutionSummary": "No resolution summary available yet.",
    "createdAt": "2026-09-04T10:00:00.000Z",
    "updatedAt": "2026-09-04T10:30:00.000Z",
    "attachments": [
      {
        "id": 101,
        "ticketId": 1,
        "originalFileName": "battery_report.pdf",
        "fileMimeType": "application/pdf",
        "fileSizeBytes": 245760,
        "isRemoved": false,
        "removedReason": null,
        "removedAt": null,
        "createdAt": "2026-09-04T10:00:00.000Z"
      },
      {
        "id": 102,
        "ticketId": 1,
        "originalFileName": "screenshot_battery_settings.png",
        "fileMimeType": "image/png",
        "fileSizeBytes": 512000,
        "isRemoved": true,
        "removedReason": "Uploaded incorrect screenshot",
        "removedAt": "2026-09-04T10:15:00.000Z",
        "createdAt": "2026-09-04T10:00:00.000Z"
      }
    ]
  }
  ```
* **Error Responses**:
  * `404 Not Found`:
    ```json
    {
      "error": "Ticket not found or you do not have permission to view it",
      "code": "TICKET_NOT_FOUND"
    }
    ```

---

### 2.3. Attachment Lifecycle Endpoints

#### `POST /api/tickets/:idOrNumber/attachments`
* **Purpose**: Upload a supporting attachment file to an existing ticket owned by the active Requester.
* **Headers**: `Content-Type: multipart/form-data`, `X-Requester-Id: <number>`.
* **Form-Data Fields**: `file` (Binary file).
* **Validation & Constraints**:
  * Ownership: Active requester must own the target ticket.
  * MIME Type Check: Only `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  * Size Check: Maximum 5 MB (5,242,880 bytes).
  * Active Attachment Limit: Current active (`isRemoved == false`) count must be `< 5`.
* **Backend Processing**:
  * Validates file buffer/stream.
  * Computes unique stored filename (e.g. `<uuid>.<ext>`).
  * Saves binary to safe storage location (`server/uploads/attachments/`).
  * Inserts record into `attachments` table with `isRemoved = false`.
* **Response `201 Created`**:
  ```json
  {
    "id": 103,
    "ticketId": 1,
    "originalFileName": "event_viewer_log.pdf",
    "fileMimeType": "application/pdf",
    "fileSizeBytes": 1048576,
    "isRemoved": false,
    "createdAt": "2026-09-04T11:00:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request` / `422 Unprocessable`:
    ```json
    {
      "error": "Ticket already contains the maximum allowed 5 active attachments",
      "code": "MAX_ATTACHMENTS_EXCEEDED"
    }
    ```
  * `413 Payload Too Large`:
    ```json
    {
      "error": "File size exceeds the 5 MB limit",
      "code": "FILE_TOO_LARGE"
    }
    ```
  * `415 Unsupported Media Type`:
    ```json
    {
      "error": "Unsupported file format. Allowed formats: JPG, PNG, WEBP, PDF",
      "code": "UNSUPPORTED_FILE_TYPE"
    }
    ```
  * `403 Forbidden` / `404 Not Found`:
    ```json
    {
      "error": "Ticket not found or permission denied",
      "code": "UNAUTHORIZED_TICKET_ACCESS"
    }
    ```

---

#### `GET /api/attachments/:id/metadata`
* **Purpose**: Retrieve metadata for an attachment associated with an owned ticket.
* **Headers**: `X-Requester-Id: <number>`.
* **Response `200 OK`**:
  ```json
  {
    "id": 101,
    "ticketId": 1,
    "originalFileName": "battery_report.pdf",
    "fileMimeType": "application/pdf",
    "fileSizeBytes": 245760,
    "isRemoved": false,
    "removedReason": null,
    "removedAt": null,
    "createdAt": "2026-09-04T10:00:00.000Z"
  }
  ```

---

#### `GET /api/attachments/:id/download`
* **Purpose**: Stream/download the binary file content of an active attachment.
* **Headers**: `X-Requester-Id: <number>` (or query param `requesterId`).
* **Validation & Soft-Removal Enforcement**:
  * Must belong to a ticket owned by the active Requester.
  * `isRemoved` check: If `isRemoved === true`, download is strictly blocked.
* **Response `200 OK` (Active Attachment)**:
  * Headers:
    * `Content-Type: application/pdf` (or corresponding MIME)
    * `Content-Disposition: attachment; filename="battery_report.pdf"`
    * `Content-Length: 245760`
  * Body: Binary stream.
* **Error Response `410 Gone` (Soft-Removed Attachment)**:
  ```json
  {
    "error": "This attachment has been removed and is no longer available for download",
    "code": "ATTACHMENT_REMOVED",
    "removedAt": "2026-09-04T10:15:00.000Z",
    "removedReason": "Uploaded incorrect screenshot"
  }
  ```
* **Error Response `404 Not Found` / `403 Forbidden`**:
  ```json
  {
    "error": "Attachment not found or permission denied",
    "code": "ATTACHMENT_NOT_FOUND"
  }
  ```

---

#### `DELETE /api/attachments/:id`
* **Purpose**: Soft-remove an attachment from an owned ticket.
* **Headers**: `Content-Type: application/json`, `X-Requester-Id: <number>`.
* **Request Body**:
  ```json
  {
    "reason": "Obsolete diagnostic report replaced with updated version"
  }
  ```
* **Processing**:
  * Verifies ownership via `ticket.requesterId`.
  * Verifies `isRemoved == false`.
  * Updates record: `isRemoved = true`, `removedAt = NOW()`, `removedReason = reason || "Removed by requester"`, `removedByRequesterId = activeRequesterId`.
  * Does NOT delete the physical file on disk (retained for audit compliance).
* **Response `200 OK`**:
  ```json
  {
    "id": 101,
    "ticketId": 1,
    "originalFileName": "battery_report.pdf",
    "isRemoved": true,
    "removedReason": "Obsolete diagnostic report replaced with updated version",
    "removedAt": "2026-09-04T11:30:00.000Z",
    "message": "Attachment soft-removed successfully"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`:
    ```json
    {
      "error": "Attachment has already been removed",
      "code": "ALREADY_REMOVED"
    }
    ```
  * `403 Forbidden` / `404 Not Found`:
    ```json
    {
      "error": "Attachment not found or permission denied",
      "code": "ATTACHMENT_NOT_FOUND"
    }
    ```

---

## 3. Query Parameter Filtering & Sorting Contract

The table below defines supported query filtering and sorting mechanisms for `GET /api/tickets`:

| Query Parameter | Target Field | Operation / Match Type | Permitted Values |
| :--- | :--- | :--- | :--- |
| `search` | `ticketNumber`, `summary` | Case-insensitive substring (`ILIKE %search%`) | String (e.g. `vpn`, `TKT-2026`) |
| `categoryId` | `categoryId` | Exact Integer match | Valid Category ID (1–4) |
| `requestedPriority` | `requestedPriority` | Exact Enum match | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `itPriority` | `itPriority` | Exact Enum match | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `status` | `status` | Exact Enum match | `NEW`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED` |
| `sortBy` | Sort column | Order property | `createdAt`, `ticketNumber`, `summary`, `status`, `requestedPriority`, `updatedAt` |
| `sortOrder` | Sort direction | Direction | `asc`, `desc` (Default: `desc`) |
| `page` | Pagination index | 1-based page index | Integer >= 1 (Default: 1) |
| `pageSize` | Pagination size | Items per page | `10`, `20`, `50` (Default: `10`, Max: `50`) |
