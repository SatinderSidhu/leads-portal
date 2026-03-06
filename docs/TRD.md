# Technical Requirements Document (TRD)

## Leads Portal — Technical Architecture & Implementation

| Field | Detail |
|-------|--------|
| Document Version | 1.0 |
| Last Updated | March 5, 2026 |
| Status | Active |

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 6.x |
| Email | Nodemailer (SMTP/Gmail) | 8.x |
| Monorepo Tool | Turborepo | 2.x |
| Package Manager | npm workspaces | 11.x |
| Containerization | Docker + Docker Compose | Latest |
| Runtime | Node.js | 20 (Alpine) |

---

## 2. Architecture Overview

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCKER ENVIRONMENT                       │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Admin Portal    │  │ Customer Portal  │  │  PostgreSQL  │  │
│  │   (Next.js)       │  │   (Next.js)      │  │   Database   │  │
│  │   Port: 3000      │  │   Port: 3001     │  │  Port: 5432  │  │
│  │                   │  │                  │  │              │  │
│  │  ┌─────────────┐  │  │  ┌────────────┐  │  │  ┌────────┐  │  │
│  │  │ Middleware   │  │  │  │ SSR Page   │  │  │  │ leads  │  │  │
│  │  │ (Auth Guard) │  │  │  │ (Welcome)  │  │  │  │ table  │  │  │
│  │  └─────────────┘  │  │  └────────────┘  │  │  └────────┘  │  │
│  │  ┌─────────────┐  │  │        │         │  │      ▲       │  │
│  │  │ API Routes  │  │  │        │         │  │      │       │  │
│  │  │ /api/auth   │  │  │        ▼         │  │      │       │  │
│  │  │ /api/leads  │──│──│──── Prisma ORM ──│──│──────┘       │  │
│  │  └─────────────┘  │  │                  │  │              │  │
│  │  ┌─────────────┐  │  │                  │  │              │  │
│  │  │ Nodemailer  │  │  │                  │  │              │  │
│  │  │ (SMTP/Gmail)│  │  │                  │  │              │  │
│  │  └──────┬──────┘  │  │                  │  │              │  │
│  └─────────│─────────┘  └──────────────────┘  └──────────────┘  │
│            │                                                     │
└────────────│─────────────────────────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  Gmail SMTP  │
      │  Server      │
      └──────────────┘
```

### 2.2 Monorepo Structure

```
leads-portal/
├── package.json                    # Root: npm workspaces config
├── turbo.json                      # Turborepo pipeline config
├── docker-compose.yml              # Docker services definition
├── Dockerfile                      # Multi-stage Docker build
├── .env                            # Environment variables (git-ignored)
├── .gitignore
├── .dockerignore
├── docs/
│   ├── BRD.md                      # Business Requirements Document
│   └── TRD.md                      # Technical Requirements Document
├── scripts/
│   └── start-admin.sh              # Docker startup script (runs migrations)
├── apps/
│   ├── admin/                      # Admin Portal (Next.js)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── middleware.ts           # Auth middleware
│   │   └── src/
│   │       ├── lib/
│   │       │   └── email.ts        # Nodemailer utility
│   │       └── app/
│   │           ├── layout.tsx       # Root layout
│   │           ├── globals.css      # Global styles
│   │           ├── page.tsx         # Redirects to /dashboard
│   │           ├── login/
│   │           │   └── page.tsx     # Login form
│   │           ├── dashboard/
│   │           │   └── page.tsx     # Leads grid
│   │           ├── leads/
│   │           │   └── new/
│   │           │       └── page.tsx # Create lead form
│   │           └── api/
│   │               ├── auth/
│   │               │   └── route.ts # POST login, DELETE logout
│   │               └── leads/
│   │                   └── route.ts # GET all, POST create
│   └── customer/                   # Customer Portal (Next.js)
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── src/
│           └── app/
│               ├── layout.tsx       # Root layout
│               ├── globals.css      # Global styles
│               └── page.tsx         # Welcome page (SSR)
└── packages/
    └── database/                   # Shared Database Package
        ├── package.json
        ├── tsconfig.json
        ├── prisma/
        │   └── schema.prisma       # Database schema
        └── src/
            └── index.ts            # PrismaClient singleton
```

---

## 3. Database Design

### 3.1 Schema Diagram

```
┌────────────────────────────────────────┐
│               leads                     │
├────────────────────────────────────────┤
│ id                 UUID    PK DEFAULT  │
│ project_name       VARCHAR NOT NULL    │
│ customer_name      VARCHAR NOT NULL    │
│ customer_email     VARCHAR NOT NULL    │
│ project_description TEXT   NOT NULL    │
│ email_sent         BOOLEAN DEFAULT false│
│ created_at         TIMESTAMP DEFAULT now│
│ updated_at         TIMESTAMP AUTO      │
└────────────────────────────────────────┘
```

### 3.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Lead {
  id                 String   @id @default(uuid())
  projectName        String   @map("project_name")
  customerName       String   @map("customer_name")
  customerEmail      String   @map("customer_email")
  projectDescription String   @map("project_description") @db.Text
  emailSent          Boolean  @default(false) @map("email_sent")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@map("leads")
}
```

### 3.3 Design Decisions

| Decision | Rationale |
|----------|-----------|
| UUID for primary key | Non-sequential IDs prevent enumeration attacks on the customer portal |
| `@map` annotations | Clean snake_case in PostgreSQL, camelCase in TypeScript |
| Single table | MVP simplicity; no separate user/auth table needed |
| `@db.Text` for description | Allows long-form project descriptions without VARCHAR limits |

---

## 4. Authentication Architecture

### 4.1 Auth Flow Diagram

```
                    ┌──────────────┐
                    │  Browser     │
                    │  Request     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Next.js     │
                    │  Middleware   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ /login   │ │ /api/auth│ │ All other│
        │ (public) │ │ (public) │ │ routes   │
        └──────────┘ └──────────┘ └────┬─────┘
                                       │
                                ┌──────┴──────┐
                                │ Has valid   │
                                │ cookie?     │
                                └──────┬──────┘
                                  │         │
                                 YES        NO
                                  │         │
                                  ▼         ▼
                            ┌────────┐ ┌────────────┐
                            │ Allow  │ │ Redirect   │
                            │ access │ │ to /login  │
                            └────────┘ └────────────┘
```

### 4.2 Implementation Details

| Component | Detail |
|-----------|--------|
| Strategy | Cookie-based session (no JWT, no NextAuth) |
| Cookie Name | `admin-session` |
| Cookie Value | Matches `SESSION_SECRET` environment variable |
| Cookie Flags | `httpOnly`, `secure` (in production), `path=/`, `maxAge=86400` |
| Public Paths | `/login`, `/api/auth` |
| Middleware Matcher | All routes except `_next/static`, `_next/image`, `favicon.ico` |

### 4.3 API Endpoints

#### `POST /api/auth` — Login

```
Request:  { "username": string, "password": string }
Response: { "success": true } (200) | { "error": "Invalid credentials" } (401)
Side Effect: Sets admin-session cookie on success
```

#### `DELETE /api/auth` — Logout

```
Request:  (none)
Response: { "success": true } (200)
Side Effect: Clears admin-session cookie
```

---

## 5. API Design

### 5.1 Leads API

#### `GET /api/leads` — List All Leads

```
Auth:     Required (middleware-enforced)
Response: Lead[] (sorted by createdAt DESC)
```

#### `POST /api/leads` — Create Lead

```
Auth:     Required (middleware-enforced)
Request:  {
  "projectName": string,
  "customerName": string,
  "customerEmail": string,
  "projectDescription": string,
  "sendEmail": boolean
}
Response: Lead (201)
```

**Flow:**

```
Receive POST request
    ↓
Validate & create lead in database
    ↓
sendEmail === true?
    ├── YES → Send welcome email via Nodemailer
    │         ├── Success → Update emailSent = true, return lead (201)
    │         └── Failure → Log error, return lead with emailWarning (201)
    └── NO  → Return lead (201)
```

### 5.2 Response Types

```typescript
interface Lead {
  id: string;            // UUID
  projectName: string;
  customerName: string;
  customerEmail: string;
  projectDescription: string;
  emailSent: boolean;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

---

## 6. Email System

### 6.1 Configuration

| Setting | Value |
|---------|-------|
| Transport | SMTP via Nodemailer |
| SMTP Host | smtp.gmail.com |
| SMTP Port | 587 |
| Authentication | Gmail App Password |
| TLS | STARTTLS (secure: false, port 587) |

### 6.2 Email Flow Diagram

```
Admin clicks "Save and Inform Client"
    ↓
POST /api/leads (sendEmail: true)
    ↓
Lead created in database
    ↓
sendWelcomeEmail() called
    ↓
Nodemailer constructs HTML email
    ↓
SMTP transport sends to Gmail
    ↓
Gmail delivers to customer's inbox
    ↓
Email contains link: CUSTOMER_PORTAL_URL?id={leadId}
    ↓
emailSent flag updated to true
```

### 6.3 Email Template Structure

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │   Gradient Header           │    │
│  │   "Welcome, {customerName}!"│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Body Card                  │    │
│  │                              │    │
│  │   "We're excited to get      │    │
│  │   started on {projectName}   │    │
│  │   with you."                 │    │
│  │                              │    │
│  │   ┌──────────────────────┐   │    │
│  │   │  View Your Project   │   │    │
│  │   │  (CTA Button)        │   │    │
│  │   └──────────────────────┘   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Footer: "Reply to this email"      │
└─────────────────────────────────────┘
```

---

## 7. Customer Portal Architecture

### 7.1 Rendering Strategy

The customer portal uses **Server-Side Rendering (SSR)** via Next.js Server Components.

```
Browser requests: http://localhost:3001?id={uuid}
    ↓
Next.js Server Component receives searchParams
    ↓
Server queries PostgreSQL via Prisma
    ↓
[Lead found]     → Renders welcome page with project data
[Lead not found] → Renders "Project Not Found" page
[No ID param]    → Renders "No Project ID Provided" page
    ↓
Fully rendered HTML sent to browser (no client-side fetching)
```

### 7.2 Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Lead ID guessability | UUIDs are random, not sequential |
| Data exposure | Only safe fields returned (no internal metadata) |
| No auth needed | By design — access via unique link acts as a token |

---

## 8. Docker Architecture

### 8.1 Container Topology

```
docker-compose.yml
    │
    ├── db (postgres:16-alpine)
    │   ├── Port: 5432
    │   ├── Volume: pgdata (persistent)
    │   └── Healthcheck: pg_isready
    │
    ├── admin (Dockerfile → target: admin)
    │   ├── Port: 3000
    │   ├── Depends on: db (healthy)
    │   └── Startup: runs prisma db push, then next start
    │
    └── customer (Dockerfile → target: customer)
        ├── Port: 3001
        └── Depends on: db (healthy)
```

### 8.2 Multi-Stage Dockerfile

```
Stage 1: deps          → Install npm dependencies
Stage 2: prisma        → Generate Prisma Client
Stage 3: admin-builder → Build admin Next.js app
Stage 4: customer-builder → Build customer Next.js app
Stage 5: admin         → Production admin image (slim)
Stage 6: customer      → Production customer image (slim)
```

### 8.3 Database Migration Strategy

The admin container runs `prisma db push` on startup (via `scripts/start-admin.sh`) to ensure the database schema is up to date before the app starts.

---

## 9. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/leads_portal` |
| `SESSION_SECRET` | Cookie value for admin auth | Random string |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username (Gmail address) | `user@gmail.com` |
| `SMTP_PASS` | SMTP password (Gmail App Password) | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Sender email address | `user@gmail.com` |
| `CUSTOMER_PORTAL_URL` | Base URL of customer portal | `http://localhost:3001` |

**Security:** The `.env` file is listed in both `.gitignore` and `.dockerignore` to prevent secrets from being committed or included in Docker images.

---

## 10. Request/Response Flow Diagrams

### 10.1 Full Lead Creation with Email

```
┌────────┐         ┌────────────┐         ┌──────────┐         ┌────────┐
│ Admin  │         │ Admin App  │         │ Database │         │ Gmail  │
│ Browser│         │ (Next.js)  │         │ (Postgres)│        │ SMTP   │
└───┬────┘         └─────┬──────┘         └────┬─────┘         └───┬────┘
    │                     │                     │                    │
    │  POST /api/leads    │                     │                    │
    │  {sendEmail: true}  │                     │                    │
    │────────────────────>│                     │                    │
    │                     │                     │                    │
    │                     │  INSERT INTO leads  │                    │
    │                     │────────────────────>│                    │
    │                     │                     │                    │
    │                     │     lead record     │                    │
    │                     │<────────────────────│                    │
    │                     │                     │                    │
    │                     │     sendMail()      │                    │
    │                     │────────────────────────────────────────>│
    │                     │                     │                    │
    │                     │     email sent      │                    │
    │                     │<────────────────────────────────────────│
    │                     │                     │                    │
    │                     │  UPDATE emailSent   │                    │
    │                     │────────────────────>│                    │
    │                     │                     │                    │
    │   201 { lead }      │                     │                    │
    │<────────────────────│                     │                    │
    │                     │                     │                    │
    │  Router.push        │                     │                    │
    │  (/dashboard)       │                     │                    │
    │                     │                     │                    │
```

### 10.2 Customer Portal Access

```
┌──────────┐         ┌──────────────┐         ┌──────────┐
│ Customer │         │ Customer App │         │ Database │
│ Browser  │         │  (Next.js)   │         │ (Postgres)│
└────┬─────┘         └──────┬───────┘         └────┬─────┘
     │                      │                      │
     │  GET /?id={uuid}     │                      │
     │─────────────────────>│                      │
     │                      │                      │
     │                      │  SELECT * FROM leads │
     │                      │  WHERE id = {uuid}   │
     │                      │─────────────────────>│
     │                      │                      │
     │                      │    lead record       │
     │                      │<─────────────────────│
     │                      │                      │
     │   Rendered HTML      │                      │
     │   (Welcome Page)     │                      │
     │<─────────────────────│                      │
     │                      │                      │
```

---

## 11. Development Workflow

### 11.1 Local Development (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema to local PostgreSQL
npm run db:push

# 4. Start both apps in dev mode
npm run dev
# Admin: http://localhost:3000
# Customer: http://localhost:3001
```

### 11.2 Docker Development

```bash
# Start all services (PostgreSQL + both apps)
docker compose up --build

# Admin: http://localhost:3000
# Customer: http://localhost:3001
# PostgreSQL: localhost:5432
```

### 11.3 Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both apps in development mode |
| `npm run build` | Build both apps for production |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:push` | Push schema changes to the database |
| `docker compose up --build` | Build and start all Docker services |
| `docker compose down` | Stop all Docker services |
| `docker compose down -v` | Stop services and delete database volume |

---

## 12. Shared Database Package

### 12.1 Package: `@leads-portal/database`

The shared database package provides a singleton Prisma client used by both apps.

**Key file:** `packages/database/src/index.ts`

```typescript
// Singleton pattern prevents multiple Prisma instances in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Usage in apps:**

```typescript
import { prisma } from "@leads-portal/database";
```

Both Next.js apps include `transpilePackages: ["@leads-portal/database"]` in their `next.config.ts` to ensure the workspace package is compiled correctly.

---

## 13. Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | March 5, 2026 | Initial document creation | — |
