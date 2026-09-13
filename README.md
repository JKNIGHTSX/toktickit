# TokTickIT — Full-Stack IT Service Desk Application

TokTickIT is a full-stack IT service desk web application designed to streamline internal IT support requests for Account & Access, Hardware, Software, and Network issues.

The project features a modern React client, Express RESTful API, PostgreSQL database managed via Prisma ORM, strict file upload attachment handling, and automated test coverage across unit, integration, and end-to-end layers.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5 |
| **Backend** | Node.js, Express, TypeScript, Multer (File Uploads) |
| **Database & ORM** | PostgreSQL 16, Prisma ORM |
| **Testing** | Vitest, Supertest, React Testing Library, Playwright (E2E) |
| **Workflow** | Git Flow (`main`, `lab2-staging`, `feature/*`), GitHub Projects |

---

## ✨ Key Features

- 👤 **Requester Context Switching**: Toggle between active requesters in development mode to simulate real user interactions.
- 📋 **Dynamic Reference Data**: Dynamic loading of IT support categories and enterprise related systems.
- 🎫 **Ticket Lifecycle Management**:
  - Create tickets with field validations, requested priorities, and category/system associations.
  - View ticket lists with status badges, priority tags, search filters, category/system filters, and pagination.
  - Manage status transitions (`NEW` → `OPEN` → `IN_PROGRESS` → `RESOLVED` / `CLOSED` / `CANCELLED`).
  - Update IT assigned priority and input resolution summaries upon ticket resolution.
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
| `GET` | `/api/health` | System health check & DB ping |
| `GET` | `/api/requesters` | List active development requesters |
| `GET` | `/api/categories` | List active IT request categories |
| `GET` | `/api/related-systems` | List active enterprise related systems |
| `GET` | `/api/tickets` | Search & list tickets (filters: `search`, `categoryId`, `systemId`, `status`, `page`, `limit`) |
| `POST` | `/api/tickets` | Create a new IT support ticket |
| `GET` | `/api/tickets/:id` | Fetch ticket details with requester, category, related system, and attachments |
| `PATCH` | `/api/tickets/:id` | Update ticket status, priority, owner, or resolution summary |
| `POST` | `/api/tickets/:id/attachments` | Upload file attachment to ticket |
| `GET` | `/api/attachments/:id/download` | Download ticket file attachment |
| `DELETE` | `/api/attachments/:id` | Soft-delete file attachment with reason |

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
│   │   ├── components/         # Ticket form, listing, detail, requester switcher
│   │   ├── context/            # Requester React Context & provider
│   │   ├── api.ts              # API client methods
│   │   └── App.tsx             # Root component with navigation & tabs
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
│   └── lab-02/                 # Lab 2 specification, API spec, UI spec, test matrix & reviews
├── e2e/                        # Playwright End-to-End test suites
├── docker-compose.yml          # Docker Compose for PostgreSQL
├── playwright.config.ts        # Playwright test configuration
├── .gitignore                  # Ignore rules for build, environment, scratch & upload artifacts
└── README.md                   # Application documentation & setup guide
```

---

## 🌿 Git & Collaboration Workflow

1. Feature development is performed on dedicated feature branches (`feature/*`).
2. Pull Requests target staging (`lab2-staging`).
3. Code review and peer sign-offs are documented under `docs/lab-02/reviewer.md`.
4. Staging releases are merged into `main` after verification.