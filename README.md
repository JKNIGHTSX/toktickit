# TokTickIT — Full-Stack IT Service Desk Application

TokTickIT is a full-stack IT service desk web application designed to streamline internal IT support requests for Account & Access, Hardware, Software, and Network issues. The application supports authenticated Requesters, IT Staff, and Administrators, with role-based ticket workflows, audit-quality Actions Taken logging, resolution gate enforcement, role-specific dashboards, and comprehensive user administration.

The project features a React client, Express REST API, PostgreSQL database managed via Prisma ORM, secure session-based authentication, file attachment handling, optimistic concurrency control, and automated unit, integration, and end-to-end tests across four progressive labs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5 (Zen Green theme) |
| **Backend** | Node.js, Express, TypeScript, Multer (File Uploads) |
| **Database & ORM** | PostgreSQL 16, Prisma ORM |
| **Auth** | express-session, bcryptjs, HTTP-only cookies |
| **Testing** | Vitest, Supertest, React Testing Library, Playwright (E2E) |
| **Workflow** | Git Flow (`main`, `lab4-staging`, `feature/*`), GitHub Projects |

---

## ✨ Key Features

### Labs 1–3 (Foundation)
- 🔐 **Authentication & Role-Based Access**: Email/password login with bcrypt-hashed passwords, authenticated sessions, logout, and roles for Requesters, IT Staff, and Administrators.
- 🔑 **First-Login Password Change**: Users must change their initial or reset password before accessing the application.
- 📋 **Dynamic Reference Data**: Dynamic loading of IT support categories and enterprise related systems.
- 🎫 **Ticket Lifecycle Management**: Create, track, search, filter, sort, and paginate tickets across all statuses (NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED, RESOLVED, CLOSED, CANCELLED).
- 💬 **Ticket Collaboration**: Public comments visible to all parties; private internal notes restricted to IT Staff and Administrators.
- 🧑‍💼 **User Administration**: Administrators can search, create, edit, activate/deactivate users, and reset initial passwords with safeguards (self-deactivation prevention, last-admin protection).
- 📎 **Attachment Management**: Upload up to 3 attachments per ticket (PNG, JPG, PDF, TXT, DOCX, max 5MB), download, and soft-delete with audit reasons.

### Lab 4 (Actions Taken, Resolution Gate, Dashboards)
- 📝 **Actions Taken Audit Log**: IT Staff and Administrators can record structured action records on each ticket. Each record captures action description, result, optional follow-up note (required when `isFollowUpRequired = true`), attachment notes, and an independent performer identity — separate from ticket ownership.
- 🔒 **Resolution Gate**: Transitioning a ticket to `RESOLVED` requires at least one Action Taken record AND a resolution summary of at least 5 characters. The gate is enforced server-side; client UI reflects the gate state dynamically.
- 🔄 **Optimistic Concurrency Control**: Concurrent edits to Action Taken records are detected via `expectedUpdatedAt` comparison, returning `409 STALE_UPDATE_CONFLICT` without losing the user's entered data.
- 📊 **Role-Based Dashboards**:
  - **IT Staff Dashboard**: 5 operational queue metrics (New, Open, In Progress, Waiting for Requester, My Assigned), Recent Tickets, Recently Resolved, and Quick Actions with drill-down navigation.
  - **Administrator Dashboard**: All IT Staff metrics plus User Summary (Total, Active, Inactive users).
  - **Requester Dashboard**: 4 personal metrics (Total Open, In Progress, Resolved, Closed), My Recent Tickets, and Quick Actions.
- 🩺 **System Diagnostics & Health Monitoring**: Automated health checks verifying database connectivity and service state.

---

## 📋 Prerequisites

Ensure the following tools are installed on your machine before running the project:

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose** (for running local PostgreSQL instance)

---

## 🚀 Getting Started

### 1. Clone & Branch Setup

```bash
git clone <repository-url>
cd toktickit
```

### 2. Configure Environment Variables

Copy the provided environment variable templates:

**Backend (`server/.env`):**
```bash
cd server
cp .env.example .env
```
*Default values:*
```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

**Frontend (`client/.env`):**
```bash
cd ../client
cp .env.example .env
```
*Default values:*
```env
VITE_API_URL="http://localhost:3000"
```

---

### 3. Start Database Service

Launch the local PostgreSQL container using Docker Compose:

```bash
# In project root
docker compose up -d
```

---

### 4. Database Setup & Seeding

Install backend dependencies, execute Prisma migrations, and populate seed data (requesters, categories, related systems):

```bash
cd server
npm install
npm run prisma:migrate
npm run prisma:seed
```

---

### 5. Start the Application Locally

#### Backend API Server:
```bash
cd server
npm run dev
```
> The API server will start on [http://localhost:3000](http://localhost:3000).

#### Frontend Client:
```bash
cd client
npm install
npm run dev
```
> The Vite development server will start on [http://localhost:5173](http://localhost:5173).

---

## 🔌 API Endpoint Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check |
| `POST` | `/api/auth/login`, `/api/auth/logout` | Sign in and end the current session |
| `GET` | `/api/auth/me` | Get the authenticated user's identity and role |
| `POST` | `/api/auth/change-password` | Change an initial or current password |
| `GET` | `/api/categories`, `/api/related-systems` | Retrieve ticket form reference data |
| `GET`, `POST` | `/api/tickets` | List accessible tickets and create a ticket |
| `GET` | `/api/tickets/:idOrNumber` | Get ticket details |
| `PATCH` | `/api/tickets/:id/claim`, `/assign`, `/priority`, `/status` | Claim/reassign tickets and manage priority or status |
| `GET`, `POST` | `/api/tickets/:id/comments` | Read or add public comments |
| `GET`, `POST` | `/api/tickets/:id/notes` | Read or add role-restricted internal notes |
| `POST` | `/api/tickets/:id/problem-appears-resolved` | Requester resolution indication |
| `GET`, `POST`, `PATCH` | `/api/users` and `/api/users/:id` | Administrator user management |
| `POST` | `/api/users/:id/reset-password` | Set a user's initial password |
| `POST`, `GET`, `DELETE` | `/api/tickets/:id/attachments`, `/api/attachments/:id/*` | Upload, download, and remove attachments |
| `POST` | `/api/tickets/:id/actions` | Record an Action Taken (IT Staff / Administrator only) |
| `PATCH` | `/api/actions/:id` | Edit an Action Taken record (with optimistic concurrency) |
| `GET` | `/api/tickets/:id/actions` | List all Actions Taken for a ticket |
| `PATCH` | `/api/tickets/:id/status` | Transition ticket status (enforces Resolution Gate) |
| `GET` | `/api/dashboard/staff` | IT Staff operational dashboard metrics |
| `GET` | `/api/dashboard/admin` | Administrator dashboard (staff metrics + user summary) |
| `GET` | `/api/dashboard/requester` | Requester personal dashboard metrics |

See [Lab 4 API specification](docs/lab-04/api-spec.md) and [Lab 3 API specification](docs/lab-03/api-spec.md) for full request/response details and authorization rules.

---

## 🧪 Running Automated Tests

### Backend Tests (Vitest & Supertest)
```bash
cd server
npm test
```

### Frontend Tests (Vitest & React Testing Library)
```bash
cd client
npm test
```

### End-to-End Tests (Playwright)
```bash
# In project root
npx playwright test
```

---

## 📂 Repository Structure

```text
toktickit/
├── client/                     # React + Vite + Bootstrap Frontend
│   ├── src/
│   │   ├── components/         # Ticket, authentication, staff, and admin screens
│   │   ├── context/            # Authentication and requester contexts
│   │   ├── api.ts              # API client methods
│   │   └── App.tsx             # Root component, navigation, and role-based screens
│   └── tests/                  # Frontend Vitest test suites
├── server/                     # Express + TypeScript + Prisma Backend
│   ├── prisma/                 # Database schema, migrations & seed scripts
│   ├── src/
│   │   ├── utils/              # Attachment validators & upload handlers
│   │   ├── app.ts              # Express application & route endpoints
│   │   └── index.ts            # Server entry point
│   ├── uploads/                # Local storage for file attachments (ignored in git)
│   └── tests/                  # Backend Supertest & unit test suites
├── docs/                       # Project Specification & Audit Documentation
│   ├── lab-01/                 # Lab 1 foundation documentation & test records
│   ├── lab-02/                 # Lab 2 specification, API spec, UI spec, test matrix & reviews
│   ├── lab-03/                 # Lab 3 specifications, tests, AI-use and peer review records
│   └── lab-04/                 # Lab 4 specifications, tests, AI-use and peer review records
├── e2e/                        # Playwright End-to-End test suites
│   ├── lab-02/                 # Lab 2 E2E: requester ticket flow, responsive QA
│   ├── lab-03/                 # Lab 3 E2E: authentication, staff flow, user admin, responsive QA
│   └── lab-04/                 # Lab 4 E2E: actions-taken-flow, ticket-resolution, dashboards
├── artifacts/                  # Visual evidence: screenshots per lab and viewport
│   ├── lab-02/                 # Lab 2 responsive screenshots
│   ├── lab-03/                 # Lab 3 responsive screenshots
│   └── lab-04/screenshots/     # Lab 4: staff-dashboard/, requester-dashboard/, actions-taken/
├── e2e/                        # Playwright End-to-End test suites
├── docker-compose.yml          # Docker Compose for PostgreSQL
├── playwright.config.ts        # Playwright test configuration
├── .gitignore                  # Ignore rules for build, environment, scratch & upload artifacts
└── README.md                   # Application documentation & setup guide
```

---

## 🌿 Git & Collaboration Workflow

1. Feature development is performed on dedicated feature branches (`feature/*`).
2. Lab 4 feature Pull Requests target `lab4-staging`.
3. Code review and peer sign-offs are documented in [docs/lab-04/reviewer.md](docs/lab-04/reviewer.md).
4. Merge the staging release into `main` after final verification.

---

## 🎬 Lab 4 Demonstration Walkthrough

### Prerequisites
- Docker is running and PostgreSQL is healthy (`docker compose up -d`).
- Backend server is running on `http://localhost:3000`.
- Frontend Vite dev server is running on `http://localhost:5173`.
- Database has been migrated and seeded (`npm run prisma:migrate && npm run prisma:seed` from `server/`).

> **Note**: All seeded users require a first-login password change. Use the seed password `Password123!` to log in, then set your new password before accessing the main application.

### Demo: IT Staff Actions Taken Workflow
1. Open `http://localhost:5173` and log in as **Tech One** (`tech1@toktickit.local` / `Password123!`).
2. If prompted, change the password to continue.
3. You will land on the **IT Staff Dashboard** showing 5 queue metric cards.
4. Click the **Ticket Queue** tab or any metric card drill-down to view the ticket list.
5. Click any ticket to open the **Ticket Detail** view.
6. Scroll down to the **Actions Taken** section.
7. Click **+ Record Action Taken** to open the form.
8. Fill in Action Description, Result, and optionally toggle **Follow-Up Required?** to reveal the follow-up note field.
9. Click **Save Action** — the action appears in the timeline with the performer's name and timestamp.
10. Click the **Edit** button on any action to update the description or follow-up status.

### Demo: Resolution Gate
1. As IT Staff, navigate to any `IN_PROGRESS` ticket.
2. Notice the **Resolve Ticket** button is **disabled** when no Actions Taken are recorded.
3. Record at least one Action Taken (see above).
4. The Resolve button becomes enabled — but only after typing a **Resolution Summary** of at least 5 characters.
5. Click **Resolve Ticket** to transition to `RESOLVED`.
6. Click **Close Ticket** to transition to `CLOSED`.

### Demo: Requester Dashboard
1. Log in as **Jennifer Anderson** (`jennifer.anderson@toktickit.local` / `Password123!`).
2. The **Requester Dashboard** appears as the landing page, showing 4 personal metric cards: Total Open, In Progress, Resolved, and Closed — scoped to this requester only.
3. Click any metric card to drill down to the filtered **My Tickets** list.
4. Click **Submit New Ticket** to create a new support request.

### Demo: Administrator Dashboard
1. Log in as an **Administrator** account (e.g., `admin@toktickit.local` / `Password123!`).
2. The dashboard shows all IT Staff operational metrics **plus** a User Summary row (Total Users, Active, Inactive).
3. Click **User Management** to administer accounts.
