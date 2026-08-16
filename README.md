# TokTickIT — Full-Stack Hello World Starter (Lab 1)

TokTickIT is an IT service desk web application for handling Account and Access, Hardware, Software, and Network requests. 

This repository contains the full-stack starter vertical slice built using **React, Vite, Bootstrap, Node.js, Express, TypeScript, Prisma, and PostgreSQL**.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5 |
| **Backend** | Node.js, Express, TypeScript |
| **Database & ORM** | PostgreSQL 16, Prisma ORM |
| **Testing** | Vitest, Supertest, Testing Library |
| **Workflow** | Git Flow (`main`, `lab1-staging`, `feature/*`), GitHub Projects |

---

## 📋 Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose** (for running PostgreSQL locally)

---

## 🚀 Getting Started

### 1. Clone & Branch Setup

```bash
git clone <repository-url>
cd toktickit
```

### 2. Configure Environment Variables

Create the local `.env` files from their respective `.env.example` templates:

**Backend (`server/.env`):**
```bash
# In server/ directory
cp .env.example .env
```
Default values:
```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

**Frontend (`client/.env`):**
```bash
# In client/ directory
cp .env.example .env
```
Default values:
```env
VITE_API_URL="http://localhost:3000"
```

---

### 3. Start Database Service

Start the PostgreSQL database container via Docker Compose:

```bash
docker compose up -d
```

---

### 4. Database Setup & Seeding

Initialize Prisma and apply migrations:

```bash
cd server
npm install
npm run prisma:migrate
npm run prisma:seed
```

---

### 5. Running the Application Locally

#### Start the Backend API Server:
```bash
cd server
npm run dev
```
> The API server will start on [http://localhost:3000](http://localhost:3000).

#### Start the Frontend Client:
```bash
cd client
npm run dev
```
> The Vite development server will start on [http://localhost:5173](http://localhost:5173).

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

---

## 📂 Repository Structure

```text
toktickit/
├── client/                     # Frontend application (React + Vite + Bootstrap)
│   ├── src/                    # UI components and API clients
│   └── tests/                  # Frontend test suites (Vitest)
│       └── lab-01/
├── server/                     # Backend API (Node.js + Express + Prisma)
│   ├── prisma/                 # Prisma schema, migrations, and seed scripts
│   ├── src/                    # Express application and route handlers
│   └── tests/                  # Backend API test suites (Supertest)
│       └── lab-01/
├── docs/                       # Project documentation & review records
│   └── lab-01/
│       ├── ai_use.md           # AI assistance record and reflection
│       ├── reviewer.md         # Peer review records
│       └── tests.md            # Test execution evidence and plan
├── docker-compose.yml          # Local PostgreSQL Docker configuration
├── .gitignore                  # Git ignore rules (secrets, build artifacts)
└── README.md                   # Project documentation & setup instructions
```

---

## 🌿 Git & Collaboration Workflow

1. All feature development takes place on dedicated feature branches:
   - `feature/1-project-foundation`
   - `feature/2-health-check`
   - `feature/3-category-seed`
   - `feature/4-category-list`
2. Pull Requests target the `lab1-staging` branch.
3. Peer review is completed and recorded in `docs/lab-01/reviewer.md`.
4. Fully verified staging releases are merged into `main`.