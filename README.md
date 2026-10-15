# TokTickIT — Full-Stack IT Service Desk Application

TokTickIT is a full-stack IT service desk web application designed to streamline internal IT support requests for Account & Access, Hardware, Software, and Network issues. The application supports authenticated Requesters, IT Staff, and Administrators, with role-based ticket workflows and user administration.

The project features a React client, Express REST API, PostgreSQL database managed via Prisma ORM, secure password authentication, session management, file attachment handling, and automated unit, integration, and end-to-end tests.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5 |
| **Backend** | Node.js, Express, TypeScript, Multer (File Uploads) |
| **Database & ORM** | PostgreSQL 16, Prisma ORM |
| **Testing** | Vitest, Supertest, React Testing Library, Playwright (E2E) |
| **Workflow** | Git Flow (`main`, `lab3-staging`, `feature/*`), GitHub Projects |

---

## ✨ Key Features

- 🔐 **Authentication & Role-Based Access**: Email/password login with bcrypt-hashed passwords, authenticated sessions, logout, and roles for Requesters, IT Staff, and Administrators.
- 🔑 **First-Login Password Change**: Users must change their initial or reset password before using the rest of the application.
- 📋 **Dynamic Reference Data**: Dynamic loading of IT support categories and enterprise related systems.
- 🎫 **Ticket Lifecycle Management**:
  - Requesters create and track their own tickets; IT Staff and Administrators manage the shared ticket queue.
  - Search, filter, sort, and paginate tickets, with responsive table and mobile card views.
  - Claim or reassign tickets, set IT priority, and perform role-appropriate status transitions.
  - Requesters can flag tickets that appear resolved; staff manage formal resolution.
- 💬 **Ticket Collaboration**: Public comments are shared with ticket owners and staff; private internal notes are restricted to IT Staff and Administrators.
- 🧑‍💼 **User Administration**: Administrators can search, create, edit, activate/deactivate users, and reset initial passwords with safeguards for administrator accounts.
- 📎 **Attachment Management**:
  - Securely upload up to 3 attachments per ticket (PNG, JPG, PDF, TXT, DOCX, max 5MB per file).
  - Download active attachments directly from the ticket detail view.
  - Soft-delete attachments with mandatory audit reasons.
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

See the [Lab 3 API specification](docs/lab-03/api-spec.md) for request/response details and authorization rules.

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
│   └── lab-03/                 # Lab 3 specifications, tests, AI-use and peer review records
├── e2e/                        # Playwright End-to-End test suites
├── docker-compose.yml          # Docker Compose for PostgreSQL
├── playwright.config.ts        # Playwright test configuration
├── .gitignore                  # Ignore rules for build, environment, scratch & upload artifacts
└── README.md                   # Application documentation & setup guide
```

---

## 🌿 Git & Collaboration Workflow

1. Feature development is performed on dedicated feature branches (`feature/*`).
2. Lab 3 feature Pull Requests target `lab3-staging`.
3. Code review and peer sign-offs are documented in [docs/lab-03/reviewer.md](docs/lab-03/reviewer.md).
4. Merge the staging release into `main` after verification.